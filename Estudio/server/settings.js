// Modelo común de ajustes para todos los drivers.
// Cada ajuste es { value, choices } donde choices es la lista ordenada de
// valores que acepta la cámara (strings tal como la cámara los reporta).

export const SETTING_KEYS = ['iso', 'aperture', 'shutter', 'wb', 'ev'];

export const LABELS = {
  iso: 'ISO',
  aperture: 'Apertura',
  shutter: 'Velocidad',
  wb: 'Balance',
  ev: 'Compens.',
};

// Valores típicos para cuando una cámara no reporta la lista de opciones.
export const DEFAULT_CHOICES = {
  iso: ['100', '125', '160', '200', '250', '320', '400', '500', '640', '800', '1000', '1250', '1600',
    '2000', '2500', '3200', '4000', '5000', '6400', '8000', '10000', '12800'],
  aperture: ['1.4', '1.8', '2', '2.2', '2.5', '2.8', '3.2', '3.5', '4', '4.5', '5', '5.6', '6.3',
    '7.1', '8', '9', '10', '11', '13', '16', '22'],
  shutter: ['1/25', '1/30', '1/40', '1/50', '1/60', '1/80', '1/100', '1/120', '1/125', '1/160',
    '1/200', '1/250', '1/320', '1/400', '1/500', '1/640', '1/800', '1/1000', '1/2000'],
  wb: Array.from({ length: 76 }, (_, i) => String(2500 + i * 100)), // 2500K..10000K
  ev: ['-3', '-2.7', '-2.3', '-2', '-1.7', '-1.3', '-1', '-0.7', '-0.3', '0', '+0.3', '+0.7', '+1',
    '+1.3', '+1.7', '+2', '+2.3', '+2.7', '+3'],
};

// Convierte "1/60", "0.5\"", "2" a segundos.
export function shutterSeconds(v) {
  const s = String(v).replace(/["s]/g, '').trim();
  if (s.includes('/')) {
    const [a, b] = s.split('/').map(Number);
    return a / b;
  }
  return Number(s);
}

export function numeric(key, v) {
  if (v == null) return NaN;
  if (key === 'shutter') return shutterSeconds(v);
  return Number(String(v).replace(/[^0-9.+-]/g, ''));
}

// Índice de la opción más cercana (numéricamente) a un valor dado.
export function nearestIndex(key, choices, target) {
  const t = numeric(key, target);
  let best = -1;
  let bestDist = Infinity;
  choices.forEach((c, i) => {
    const n = numeric(key, c);
    if (!Number.isFinite(n)) return;
    // Para ISO, apertura y velocidad la distancia perceptual es logarítmica.
    const d = ['iso', 'aperture', 'shutter'].includes(key)
      ? Math.abs(Math.log2(n) - Math.log2(t))
      : Math.abs(n - t);
    if (d < bestDist) { bestDist = d; best = i; }
  });
  return best;
}

// Devuelve el valor que resulta de moverse `step` posiciones en la lista.
export function stepValue(key, setting, step) {
  const choices = (setting.choices || []).filter((c) => Number.isFinite(numeric(key, c)));
  if (!choices.length) return setting.value;
  let i = choices.indexOf(String(setting.value));
  if (i < 0) i = nearestIndex(key, choices, setting.value);
  const next = Math.min(choices.length - 1, Math.max(0, i + step));
  return choices[next];
}

// Normaliza un valor pedido al más cercano disponible.
export function snapValue(key, setting, value) {
  const choices = setting.choices || [];
  if (choices.includes(String(value))) return String(value);
  const i = nearestIndex(key, choices, value);
  return i >= 0 ? choices[i] : String(value);
}
