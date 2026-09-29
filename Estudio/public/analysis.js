// Análisis de iluminación: compara una imagen de referencia con la toma en vivo
// y calcula cuánto mover la cámara (ISO / apertura / balance) y las luces.
//
// Funciones puras sobre { data, width, height } (como ImageData) para poder
// probarlas en Node sin navegador.

// sRGB (0-255) -> lineal (0-1)
const LUT = new Float32Array(256);
for (let i = 0; i < 256; i++) {
  const c = i / 255;
  LUT[i] = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

// Zonas en coordenadas relativas (x0, y0, x1, y1) para un encuadre tipo
// "persona a cámara": sujeto al centro, fondo a los lados.
export const ZONES = {
  subject: [0.33, 0.15, 0.67, 0.75],
  left: [0.33, 0.15, 0.5, 0.75], // mitad izquierda del sujeto (en pantalla)
  right: [0.5, 0.15, 0.67, 0.75],
  bgLeft: [0.0, 0.0, 0.22, 0.6],
  bgRight: [0.78, 0.0, 1.0, 0.6],
};

function zoneStats(img, [x0, y0, x1, y1]) {
  const { data, width, height } = img;
  const xa = Math.floor(x0 * width); const xb = Math.ceil(x1 * width);
  const ya = Math.floor(y0 * height); const yb = Math.ceil(y1 * height);
  let y = 0; let r = 0; let g = 0; let b = 0; let n = 0; let clip = 0; let crush = 0;
  for (let py = ya; py < yb; py++) {
    for (let px = xa; px < xb; px++) {
      const i = (py * width + px) * 4;
      const R = data[i]; const G = data[i + 1]; const B = data[i + 2];
      if (R > 250 || G > 250 || B > 250) clip++;
      if (R < 6 && G < 6 && B < 6) crush++;
      const lr = LUT[R]; const lg = LUT[G]; const lb = LUT[B];
      y += 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
      // Para el color solo tomamos medios tonos (evita recortes y sombras ruidosas).
      if (R > 20 && R < 245 && G > 20 && G < 245 && B > 20 && B < 245) { r += lr; g += lg; b += lb; }
      n++;
    }
  }
  return { y: y / Math.max(n, 1), r, g, b, n, clip: clip / Math.max(n, 1), crush: crush / Math.max(n, 1) };
}

export function analyze(img) {
  const s = {};
  for (const [k, z] of Object.entries(ZONES)) s[k] = zoneStats(img, z);
  const all = zoneStats(img, [0, 0, 1, 1]);
  const bgY = (s.bgLeft.y + s.bgRight.y) / 2;
  return {
    subjectY: s.subject.y,
    leftY: s.left.y,
    rightY: s.right.y,
    bgY,
    meanY: all.y,
    // relación rojo/azul (en luz lineal) del sujeto: indicador de temperatura de color
    rb: (s.subject.r + 1e-6) / (s.subject.b + 1e-6),
    clip: all.clip,
    crush: all.crush,
  };
}

const log2 = (x) => Math.log2(Math.max(x, 1e-6));
// Cuántos mired se desplaza el balance por cada unidad de ln(R/B). Es una
// aproximación: por eso el modo automático mide, aplica y vuelve a medir.
export const MIRED_PER_LN_RB = 110;
export const MAX_MIRED_STEP = 60;

export const TOLERANCE = { ev: 0.2, ratio: 0.3, bg: 0.3, mired: 8 };

// Compara referencia vs en vivo. Devuelve diferencias en pasos (stops).
export function compare(ref, live) {
  const keyOnLeft = ref.leftY >= ref.rightY;
  const ratio = (a) => (keyOnLeft ? log2(a.leftY / a.rightY) : log2(a.rightY / a.leftY));
  const sep = (a) => log2(a.subjectY / a.bgY);
  return {
    keySide: keyOnLeft ? 'izquierda' : 'derecha',
    ev: log2(ref.subjectY / live.subjectY), // + = hay que aclarar
    ratioRef: ratio(ref),
    ratioLive: ratio(live),
    ratio: ratio(ref) - ratio(live), // + = hay que aumentar el contraste (bajar relleno)
    sepRef: sep(ref),
    sepLive: sep(live),
    bg: sep(live) - sep(ref), // + = hay que subir la luz de fondo
    lnRb: Math.log(live.rb) - Math.log(ref.rb), // + = la toma está más cálida que la referencia
    clip: live.clip,
  };
}

const round = (x, d = 1) => Math.round(x * 10 ** d) / 10 ** d;
const fmtStops = (x) => `${x > 0 ? '+' : ''}${round(x, 1)} pasos`;

// "f/4" -> 4, "1/60" -> 0.0167, "5600" -> 5600
export function toNumber(v) {
  const s = String(v ?? '').replace(/^f\/?/i, '').replace(/["sK]/g, '').trim();
  if (s.includes('/')) {
    const [a, b] = s.split('/').map(Number);
    return a / b;
  }
  return parseFloat(s);
}

function nearest(choices, target, logScale = true) {
  let best = null; let bd = Infinity;
  for (const c of choices || []) {
    const n = toNumber(c);
    if (!Number.isFinite(n) || n <= 0) continue;
    const d = logScale ? Math.abs(Math.log2(n) - Math.log2(target)) : Math.abs(n - target);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}

// Traduce las diferencias a un plan concreto.
//  settings: ajustes actuales de la cámara ({ iso:{value,choices}, ... })
//  opts: { fps, maxIso, minIso, minAperture, distances:{ key, fill, bg } (cm) }
export function plan(diff, settings, opts = {}) {
  const camera = {}; // cambios aplicables automáticamente
  const steps = []; // explicación para mostrar
  const lights = []; // lo que tienes que mover tú
  const ok = {
    ev: Math.abs(diff.ev) < TOLERANCE.ev,
    ratio: Math.abs(diff.ratio) < TOLERANCE.ratio,
    bg: Math.abs(diff.bg) < TOLERANCE.bg,
  };
  const d = opts.distances || {};

  // 1) Exposición del sujeto: primero ISO, después apertura, después luz principal.
  let remaining = ok.ev ? 0 : diff.ev;
  const iso = toNumber(settings.iso?.value);
  if (remaining && Number.isFinite(iso)) {
    const minIso = opts.minIso || 100; const maxIso = opts.maxIso || 6400;
    const want = Math.min(maxIso, Math.max(minIso, iso * 2 ** remaining));
    const pick = nearest(settings.iso.choices, want);
    const pickN = toNumber(pick);
    if (pick && pickN !== iso) {
      camera.iso = pick;
      steps.push(`ISO ${iso} → ${pick}`);
      remaining -= log2(pickN / iso);
    }
  }
  const f = toNumber(settings.aperture?.value);
  if (Math.abs(remaining) >= TOLERANCE.ev && Number.isFinite(f) && opts.allowAperture) {
    const minF = opts.minAperture || 1.8;
    const want = Math.max(minF, f / 2 ** (remaining / 2));
    const pick = nearest(settings.aperture.choices, want);
    const pickN = toNumber(pick);
    if (pick && pickN !== f) {
      camera.aperture = pick;
      steps.push(`Apertura f/${f} → f/${toNumber(pick)}`);
      remaining -= 2 * log2(f / pickN);
    }
  }
  if (Math.abs(remaining) >= TOLERANCE.ev) {
    const factor = 2 ** (-remaining / 2);
    const txt = remaining > 0 ? 'Acerca o sube la luz principal' : 'Aleja o baja la luz principal';
    lights.push({
      light: 'Principal',
      text: `${txt}: ${fmtStops(remaining)} (potencia ×${round(2 ** remaining, 2)})`,
      distance: d.key ? `de ${d.key} cm a ${Math.round(d.key * factor)} cm` : null,
    });
  }

  // 2) Velocidad: regla de los 180° para video.
  const fps = opts.fps || 30;
  const shutter = settings.shutter?.value;
  if (shutter && settings.shutter.choices?.length) {
    const ideal = nearest(settings.shutter.choices.filter((c) => String(c).includes('/')),
      1 / (2 * fps), true);
    if (ideal && ideal !== shutter) {
      steps.push(`Velocidad ${shutter} → ${ideal} (regla de 180° a ${fps} fps; evita parpadeo)`);
      camera.shutter = ideal;
    }
  }

  // 3) Balance de blancos (Kelvin en la cámara).
  const k = toNumber(settings.wb?.value);
  if (Number.isFinite(k)) {
    // Limitamos el salto por medición: el modo automático converge en varias vueltas.
    const shift = Math.max(-MAX_MIRED_STEP, Math.min(MAX_MIRED_STEP, diff.lnRb * MIRED_PER_LN_RB));
    const newMired = 1e6 / k + shift;
    const target = 1e6 / newMired;
    const pick = nearest(settings.wb.choices, target, false);
    if (pick && Math.abs(1e6 / toNumber(pick) - 1e6 / k) >= TOLERANCE.mired) {
      camera.wb = pick;
      steps.push(`Balance ${k}K → ${pick}K (${diff.lnRb > 0 ? 'la toma está más cálida' : 'la toma está más fría'} que la referencia)`);
    }
  }

  // 4) Contraste principal/relleno.
  if (!ok.ratio) {
    const factor = 2 ** (diff.ratio / 2);
    lights.push({
      light: 'Relleno',
      text: `${diff.ratio > 0 ? 'Aleja o baja' : 'Acerca o sube'} el relleno (lado opuesto a la principal, ${diff.keySide === 'izquierda' ? 'derecha' : 'izquierda'} en pantalla): `
        + `contraste actual ${round(diff.ratioLive)} vs referencia ${round(diff.ratioRef)} pasos (potencia ×${round(2 ** -diff.ratio, 2)})`,
      distance: d.fill ? `de ${d.fill} cm a ${Math.round(d.fill * factor)} cm` : null,
    });
  }

  // 5) Separación del fondo.
  if (!ok.bg) {
    const factor = 2 ** (-diff.bg / 2);
    lights.push({
      light: 'Fondo',
      text: `${diff.bg > 0 ? 'Sube o acerca' : 'Baja o aleja'} la luz de fondo: separación actual ${round(diff.sepLive)} vs referencia ${round(diff.sepRef)} pasos (potencia ×${round(2 ** diff.bg, 2)})`,
      distance: d.bg ? `de ${d.bg} cm a ${Math.round(d.bg * factor)} cm` : null,
    });
  }

  if (diff.clip > 0.02) lights.push({ light: 'Aviso', text: `${round(diff.clip * 100)}% de la imagen está quemada (blancos recortados).`, distance: null });

  const matched = ok.ev && ok.ratio && ok.bg && !camera.wb && !camera.iso;
  return { camera, steps, lights, ok, matched, remainingEv: remaining };
}
