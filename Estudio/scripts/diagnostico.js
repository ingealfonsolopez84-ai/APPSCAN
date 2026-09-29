// Diagnóstico de la cámara por USB (pensado para Sony ZV-E10, sirve para cualquiera
// compatible con gphoto2). Genera diagnostico-camara.txt para compartirlo.
//
//   npm run diagnostico              -> solo lectura (no cambia nada en la cámara)
//   npm run diagnostico -- --escribir -> además sube ISO un paso y lo regresa
//   npm run diagnostico -- --grabar   -> además graba un clip de 3 segundos
//
// Cierra el portal (npm start) antes de correrlo: el USB solo admite un programa a la vez.

import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Gphoto2Driver, releaseMacPtp } from '../server/drivers/gphoto2.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPORT = path.join(ROOT, 'diagnostico-camara.txt');
const PREVIEW = path.join(ROOT, 'diagnostico-preview.jpg');
const args = new Set(process.argv.slice(2));
const lines = [];

const log = (msg = '') => { console.log(msg); lines.push(msg); };
const ok = (msg) => log(`  ✅ ${msg}`);
const warn = (msg) => log(`  ⚠️  ${msg}`);
const fail = (msg) => log(`  ❌ ${msg}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function gp(argv, { binary = false, timeout = 20000 } = {}) {
  return new Promise((resolve) => {
    execFile('gphoto2', argv, { encoding: binary ? 'buffer' : 'utf8', timeout, maxBuffer: 64 * 1024 * 1024, env: { ...process.env, LANG: 'C', LC_ALL: 'C', LANGUAGE: 'C' } },
      (err, stdout, stderr) => resolve({ err, stdout, stderr: String(stderr || '') }));
  });
}

async function finish(code = 0) {
  await fs.writeFile(REPORT, `${lines.join('\n')}\n`);
  console.log(`\n📄 Reporte guardado en: ${REPORT}`);
  console.log('   Copia su contenido y pégalo en el chat con Claude.');
  process.exit(code);
}

log('=== Diagnóstico de cámara · Estudio ===');
log(`Fecha: ${new Date().toISOString()}`);
log(`Sistema: ${process.platform} ${process.arch} · Node ${process.version}`);
log('');

// 1. gphoto2 instalado
log('1) gphoto2');
const ver = await gp(['--version']);
if (ver.err) {
  fail('gphoto2 no está instalado.');
  log(process.platform === 'darwin'
    ? '     Instálalo con:  brew install gphoto2   (Homebrew: https://brew.sh)'
    : '     Instálalo con:  sudo apt install gphoto2');
  await finish(1);
}
ok(ver.stdout.split('\n')[0]);
const libLine = ver.stdout.split('\n').find((l) => l.startsWith('libgphoto2 '));
if (libLine) log(`     ${libLine.trim()}`);

// 2. Detección
log('');
log('2) Detección por USB');
if (process.platform === 'darwin') {
  await releaseMacPtp();
  ok('Liberé la cámara de macOS (ptpcamerad)');
}
const det = await gp(['--auto-detect']);
const detected = det.stdout.split('\n').slice(2).map((l) => l.trim()).filter(Boolean);
if (!detected.length) {
  fail('No se detectó ninguna cámara.');
  log('     Revisa en la ZV-E10:');
  log('       • MENU → Configuración (maletín) → Conexión USB → "Control remoto PC"');
  log('       • Si tu firmware lo tiene: Función control remoto PC → Control remoto PC: Activado');
  log('       • Usa un cable USB de datos (algunos cables solo cargan).');
  log('       • Cierra Imaging Edge, Lightroom, Fotos o Captura de Imagen si están abiertos.');
  log('       • No uses "Transmisión USB" (modo webcam): en ese modo no se puede controlar.');
  await finish(1);
}
for (const d of detected) ok(d);
if (detected.length > 1) warn('Hay varias cámaras: añade "port" en estudio.config.json con el puerto de la Sony.');
if (!/ZV-E10|Sony|ILCE|ZV/i.test(detected.join(' '))) warn('No parece una Sony; el diagnóstico sigue de todos modos.');
if (/Mass Storage|MSC/i.test(detected.join(' '))) warn('La cámara está en modo "Almacenamiento masivo": cámbiala a "Control remoto PC".');

// 3. Resumen
log('');
log('3) Resumen de la cámara');
const sum = await gp(['--summary']);
if (sum.err) warn(`--summary falló: ${sum.stderr.trim().split('\n').pop()}`);
for (const l of sum.stdout.split('\n')) {
  if (/^(Model|Manufacturer|Version|Serial Number|Vendor Extension)/i.test(l.trim())) log(`     ${l.trim()}`);
}

// 4. Configuración completa (lo más útil para ajustar el driver)
log('');
log('4) Ajustes disponibles');
const all = await gp(['--list-all-config'], { timeout: 60000 });
if (all.err) {
  fail(`No pude leer los ajustes: ${all.stderr.trim().split('\n').pop()}`);
} else {
  const blocks = all.stdout.split(/\n(?=\/main\/)/);
  const interesting = /\/(iso|f-number|aperture|shutterspeed|whitebalance|colortemperature|exposurecompensation|movie|manualfocus|autofocus|focusmode|zoom|expprogram|exposureprogram|batterylevel|capturemode|recordingmedia|movieformat|moviequality)\b/;
  for (const b of blocks) {
    if (!interesting.test(b.split('\n')[0])) continue;
    const head = b.split('\n');
    const choices = head.filter((l) => l.startsWith('Choice:'));
    const shown = head.filter((l) => !l.startsWith('Choice:') && l !== 'END');
    log(`     ${shown.join(' | ')}`);
    if (choices.length) {
      const vals = choices.map((c) => c.replace(/^Choice: \d+ /, ''));
      log(`        opciones (${vals.length}): ${vals.slice(0, 40).join(', ')}${vals.length > 40 ? ' …' : ''}`);
    }
  }
  const prog = blocks.find((b) => /\/(expprogram|exposureprogram)\b/.test(b));
  const progVal = prog?.match(/Current: (.*)/)?.[1];
  if (progVal && !/^M$|\(M\)|manual/i.test(progVal)) {
    warn(`Modo de exposición: "${progVal}". Para cambiar ISO, apertura y velocidad desde el portal pon la cámara en Exposición manual (M).`);
  }
}

// 5. Driver del portal
log('');
log('5) Driver del portal (sony-usb)');
const driver = new Gphoto2Driver({ id: 'zv-e10', driver: 'sony-usb' });
await driver.connect();
if (!driver.state.connected) {
  fail(driver.state.message);
  await finish(1);
}
ok(`Conectado: ${driver.state.model || '(modelo no reportado)'}`);
log(`     Nombres detectados: ${JSON.stringify(driver.names)}`);
log(`     Capacidades: ${JSON.stringify(driver.caps)}`);
for (const [k, s] of Object.entries(driver.state.settings)) {
  log(`     ${k.padEnd(9)} = ${s.value}${s.readonly ? ' (solo lectura)' : ''}  [${s.choices.length} opciones]`);
}
log(`     Batería: ${driver.state.battery ?? '—'} · Almacenamiento: ${JSON.stringify(driver.state.storage)}`);
log(`     Temperatura: ${driver.state.temperature ?? '—'} · Grabando: ${driver.state.recording ? 'sí' : 'no'}`);
const missing = ['iso', 'aperture', 'shutter', 'wb', 'ev'].filter((k) => !driver.caps.settings.includes(k));
if (missing.length) warn(`Ajustes no encontrados: ${missing.join(', ')}`);
if (!driver.caps.record) warn('No encontré el control de grabación de video ("movie").');

// 6. Vista previa
log('');
log('6) Vista previa por USB');
const t0 = Date.now();
let frames = 0;
for (let i = 0; i < 5; i++) {
  try {
    const jpg = await driver.frame();
    if (jpg?.length > 1000) {
      frames++;
      if (frames === 1) await fs.writeFile(PREVIEW, jpg);
    }
  } catch (e) {
    fail(`capture-preview: ${e.message}`);
    break;
  }
}
if (frames) {
  ok(`${frames}/5 frames · ${(frames / ((Date.now() - t0) / 1000)).toFixed(1)} fps · primer frame en ${PREVIEW}`);
} else {
  warn('Sin vista previa por USB (usa una capturadora HDMI y "Vista fluida").');
}

// 7. Escritura (opcional): cada ajuste por separado, esperando a que la cámara responda.
log('');
if (args.has('--escribir')) {
  log('7) Prueba de escritura (cambia cada ajuste y lo regresa)');
  const pick = (key, prefer) => {
    const s = driver.state.settings[key];
    if (!s) return null;
    const opts = s.choices.filter((c) => c !== s.value && /\d/.test(c));
    return prefer.find((p) => opts.includes(p)) || opts[Math.floor(opts.length / 2)];
  };
  const tests = [
    ['iso', pick('iso', ['800', '1600', '400'])],
    ['shutter', pick('shutter', ['1/60', '1/50', '1/30'])],
    ['aperture', pick('aperture', ['f/5.6', 'f/4', 'f/8'])],
    ['wb', pick('wb', ['5600', '5000', '4500'])],
    ['ev', pick('ev', ['0.3', '+0.3', '-0.3'])],
  ];
  for (const [key, target] of tests) {
    const s = driver.state.settings[key];
    if (!s || !target) { warn(`${key}: no disponible`); continue; }
    if (s.readonly && key !== 'wb') { log(`  ➖ ${key}: bloqueado por la cámara en este modo (se omite)`); continue; }
    const before = s.value;
    try {
      await driver.applySetting(key, target);
      await sleep(1500);
      await driver.refresh();
      const after = driver.state.settings[key].value;
      if (after === target) ok(`${key}: ${before} → ${after}`);
      else warn(`${key}: pedí ${target}, la cámara quedó en ${after}`);
    } catch (e) {
      fail(`${key}: ${e.message}`);
    }
    try {
      if (key === 'wb' && driver.names.whitebalance && s.mode) {
        await driver.run(['--set-config', `${driver.names.whitebalance}=${s.mode}`]); // regresa el modo original
      } else if (driver.state.settings[key].value !== before) {
        await driver.run(['--set-config', `${driver.names[key]}=${before}`]);
      }
      await sleep(800);
    } catch (e) {
      warn(`${key}: no pude regresarlo a ${before} (${e.message}); ajústalo a mano`);
    }
  }

  log('   Enfoque:');
  const fm = driver.names.focusmode;
  let fmBefore = null;
  try {
    if (fm) fmBefore = (await driver.getBlock(fm)).current;
    await driver.focus('far');
    await sleep(800);
    await driver.focus('near');
    ok('Enfoque manual: cerca/lejos aceptado (¿viste moverse el enfoque en la pantalla?)');
  } catch (e) {
    fail(`Enfoque manual: ${e.message}`);
  }
  try {
    if (fm && fmBefore) await driver.run(['--set-config', `${fm}=${fmBefore}`]);
    await driver.focus('af');
    ok(`Autoenfoque aceptado (modo de enfoque regresado a ${fmBefore || 'original'})`);
  } catch (e) {
    fail(`Autoenfoque: ${e.message}`);
  }

  if (driver.names.zoomOp) {
    log('   Zoom motorizado (experimental):');
    try {
      await driver.zoom('in', true);
      await sleep(600);
      await driver.zoom('in', false);
      await sleep(400);
      await driver.zoom('out', true);
      await sleep(600);
      await driver.zoom('out', false);
      ok('Comandos de zoom aceptados (¿se movió el zoom del lente?)');
    } catch (e) {
      fail(`Zoom: ${e.message}`);
    }
  }
} else {
  log('7) Prueba de escritura: omitida (usa --escribir para probarla)');
}

// 8. Grabación (opcional)
log('');
if (args.has('--grabar') && driver.caps.record) {
  log('8) Prueba de grabación (3 s)');
  try {
    await driver.record(true);
    ok('Grabación iniciada');
    await sleep(3000);
    await driver.record(false);
    ok('Grabación detenida: revisa que haya un clip nuevo en la tarjeta');
  } catch (e) {
    fail(`Grabación: ${e.message} (la cámara debe estar en modo video y con tarjeta)`);
  }
} else {
  log('8) Prueba de grabación: omitida (usa --grabar para probarla)');
}

log('');
log('Configuración completa (para Claude):');
log(all.stdout || '(no disponible)');
await finish(0);
