import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stepValue, snapValue, DEFAULT_CHOICES } from '../server/settings.js';
import { parseConfigBlocks } from '../server/drivers/gphoto2.js';
import { SonyLiveviewParser } from '../server/drivers/sony-wifi.js';
import { analyze, compare, plan } from '../public/analysis.js';

test('stepValue avanza y respeta los límites', () => {
  const iso = { value: '800', choices: DEFAULT_CHOICES.iso };
  assert.equal(stepValue('iso', iso, 1), '1000');
  assert.equal(stepValue('iso', iso, -1), '640');
  assert.equal(stepValue('iso', { value: '100', choices: DEFAULT_CHOICES.iso }, -1), '100');
  // Valor que no está en la lista: parte del más cercano.
  assert.equal(stepValue('shutter', { value: '1/64', choices: DEFAULT_CHOICES.shutter }, 1), '1/80');
});

test('snapValue elige la opción más cercana', () => {
  assert.equal(snapValue('iso', { choices: DEFAULT_CHOICES.iso }, 2100), '2000');
  assert.equal(snapValue('wb', { choices: DEFAULT_CHOICES.wb }, 5630), '5600');
});

test('parseConfigBlocks lee la salida de gphoto2', () => {
  const out = `/main/imgsettings/iso
Label: ISO Speed
Readonly: 0
Type: RADIO
Current: 2000
Choice: 0 Auto ISO
Choice: 1 100
Choice: 2 2000
END`;
  const b = parseConfigBlocks(out).iso;
  assert.equal(b.current, '2000');
  assert.deepEqual(b.choices, ['Auto ISO', '100', '2000']);
});

test('SonyLiveviewParser extrae el JPEG de cada paquete', () => {
  const jpg = Buffer.from([0xff, 0xd8, 1, 2, 3, 0xff, 0xd9]);
  const packet = (payload) => {
    const common = Buffer.from([0xff, 0x01, 0, 1, 0, 0, 0, 0]);
    const ph = Buffer.alloc(128);
    ph.writeUInt32BE(0x24356879, 0);
    ph.writeUIntBE(payload.length, 4, 3);
    ph[7] = 2; // relleno
    return Buffer.concat([common, ph, payload, Buffer.alloc(2)]);
  };
  const frames = [];
  const p = new SonyLiveviewParser((f) => frames.push(f));
  const stream = Buffer.concat([packet(jpg), packet(jpg)]);
  p.push(stream.subarray(0, 50)); // llega en trozos
  p.push(stream.subarray(50));
  assert.equal(frames.length, 2);
  assert.deepEqual(frames[0], jpg);
});

// Imagen sintética: sujeto con lado izquierdo/derecho y fondo.
function synth({ left, right, bg, tint = [1, 1, 1] }) {
  const width = 160; const height = 90;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const u = x / width; const v = y / height;
      let val = bg;
      if (u >= 0.33 && u < 0.67 && v >= 0.15 && v < 0.75) val = u < 0.5 ? left : right;
      const i = (y * width + x) * 4;
      data[i] = val * tint[0]; data[i + 1] = val * tint[1]; data[i + 2] = val * tint[2]; data[i + 3] = 255;
    }
  }
  return { data, width, height };
}

test('la misma imagen coincide consigo misma', () => {
  const a = analyze(synth({ left: 180, right: 120, bg: 60 }));
  const d = compare(a, a);
  const p = plan(d, {}, {});
  assert.ok(Math.abs(d.ev) < 1e-6);
  assert.ok(p.ok.ev && p.ok.ratio && p.ok.bg);
});

test('toma más oscura -> subir ISO', () => {
  const ref = analyze(synth({ left: 180, right: 120, bg: 60 }));
  const live = analyze(synth({ left: 130, right: 87, bg: 43 }));
  const d = compare(ref, live);
  assert.ok(d.ev > 0.7 && d.ev < 1.3, `ev=${d.ev}`);
  const settings = { iso: { value: '800', choices: DEFAULT_CHOICES.iso } };
  const p = plan(d, settings, { maxIso: 6400 });
  assert.ok(Number(p.camera.iso) >= 1250 && Number(p.camera.iso) <= 2000, `iso=${p.camera.iso}`);
});

test('contraste plano -> alejar relleno con distancia calculada', () => {
  const ref = analyze(synth({ left: 200, right: 110, bg: 60 }));
  const live = analyze(synth({ left: 200, right: 170, bg: 60 }));
  const d = compare(ref, live);
  assert.ok(d.ratio > 0.5);
  const p = plan(d, {}, { distances: { fill: 100 } });
  const fill = p.lights.find((l) => l.light === 'Relleno');
  assert.ok(fill, 'debe recomendar mover el relleno');
  const newCm = Number(fill.distance.match(/a (\d+) cm/)[1]);
  assert.ok(newCm > 100, `nueva distancia ${newCm}`);
});

test('toma más cálida -> bajar Kelvin', () => {
  const ref = analyze(synth({ left: 180, right: 120, bg: 60 }));
  const live = analyze(synth({ left: 180, right: 120, bg: 60, tint: [1.1, 1, 0.85] }));
  const d = compare(ref, live);
  assert.ok(d.lnRb > 0);
  const p = plan(d, { wb: { value: '5600', choices: DEFAULT_CHOICES.wb } }, {});
  assert.ok(Number(p.camera.wb) < 5600, `wb=${p.camera.wb}`);
});

test('plan entiende "f/4" y "1/60" (formatos de gphoto2) y aplica la regla de 180°', () => {
  const ref = analyze(synth({ left: 180, right: 120, bg: 60 }));
  const live = analyze(synth({ left: 60, right: 40, bg: 20 })); // muy oscura
  const settings = {
    iso: { value: '1600', choices: ['Auto ISO', '400', '800', '1600'] },
    aperture: { value: 'f/4', choices: ['f/2.8', 'f/4', 'f/5.6'] },
    shutter: { value: '1/100', choices: ['1/50', '1/60', '1/100'] },
  };
  const p = plan(compare(ref, live), settings, { fps: 30, maxIso: 1600, allowAperture: true });
  assert.equal(p.camera.iso, undefined); // ya está en el máximo
  assert.equal(p.camera.aperture, 'f/2.8');
  assert.equal(p.camera.shutter, '1/60');
  assert.ok(p.lights.some((l) => l.light === 'Principal'));
});
