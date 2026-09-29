// Prueba de conexión continua con gphoto2 (--shell): una sola sesión USB
// para todos los comandos. Guarda la transcripción completa en prueba-shell.txt.
//
//   npm run prueba-shell
//
// Mira la pantalla de la cámara mientras corre: debe cambiar ISO, velocidad,
// apertura, balance y enfoque, y al final todo regresa a como estaba.

import { spawn, execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'prueba-shell.txt');
const work = await fs.mkdtemp(path.join(os.tmpdir(), 'estudio-'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const t0 = Date.now();
const stamp = () => `[${((Date.now() - t0) / 1000).toFixed(1).padStart(5)}s]`;
let transcript = '';
let buffer = '';

if (process.platform === 'darwin') {
  await new Promise((r) => execFile('killall', ['ptpcamerad', 'PTPCamera'], () => r()));
}

const gp = spawn('gphoto2', ['--shell'], {
  cwd: work,
  env: { ...process.env, LANG: 'C', LC_ALL: 'C', LANGUAGE: 'C' },
});
gp.on('error', (e) => { console.error(`No pude iniciar gphoto2: ${e.message}`); process.exit(1); });
const onData = (src) => (d) => {
  const s = d.toString();
  buffer += s;
  transcript += s.split('\n').map((l) => (l ? `${stamp()} ${src} ${l}` : '')).join('\n');
  process.stdout.write(s);
};
gp.stdout.on('data', onData('<'));
gp.stderr.on('data', onData('!'));

function send(cmd) {
  transcript += `\n${stamp()} > ${cmd}\n`;
  console.log(`\n>>> ${cmd}`);
  gp.stdin.write(`${cmd}\n`);
}

// Lee el valor actual de un ajuste desde lo que respondió la cámara.
async function current(name) {
  buffer = '';
  send(`get-config ${name}`);
  for (let i = 0; i < 40 && !/Current:.*\n/.test(buffer); i++) await sleep(100);
  return (buffer.match(/Current: (.*)/) || [])[1]?.trim();
}

async function tryValue(name, value, wait = 2500) {
  send(`set-config ${name}=${value}`);
  await sleep(wait);
  const now = await current(name);
  const ok = now === value;
  const line = `${ok ? '✅' : '⚠️ '} ${name}: pedí ${value} → la cámara reporta ${now}`;
  console.log(`\n${line}`);
  transcript += `\n${stamp()} ${line}\n`;
  return now;
}

console.log('Esperando a que la cámara esté lista (4 s)...');
await sleep(4000);

const before = {
  iso: await current('iso'),
  shutterspeed: await current('shutterspeed'),
  'f-number': await current('f-number'),
  whitebalance: await current('whitebalance'),
  focusmode: await current('focusmode'),
};
transcript += `\n${stamp()} Valores iniciales: ${JSON.stringify(before)}\n`;

await tryValue('iso', before.iso === '800' ? '400' : '800');
await tryValue('shutterspeed', before.shutterspeed === '1/60' ? '1/50' : '1/60');
await tryValue('f-number', before['f-number'] === 'f/5.6' ? 'f/4' : 'f/5.6');
await tryValue('whitebalance', 'Choose Color Temperature');
await current('colortemperature');
await tryValue('colortemperature', '4500');

// Enfoque manual
await tryValue('focusmode', 'Manual');
send('set-config manualfocus=5');
await sleep(1500);
send('set-config manualfocus=-5');
await sleep(1500);

// Vista previa: cuántos frames por segundo en una sola sesión
const p0 = Date.now();
for (let i = 0; i < 5; i++) {
  buffer = '';
  send('capture-preview');
  for (let j = 0; j < 50 && !/Saving|saved|capture_preview/i.test(buffer); j++) await sleep(100);
}
const fps = (5 / ((Date.now() - p0) / 1000)).toFixed(1);
transcript += `\n${stamp()} Vista previa en sesión continua: ${fps} fps\n`;
console.log(`\nVista previa: ${fps} fps`);

// Regresa todo a como estaba
for (const [k, v] of Object.entries(before)) if (v) send(`set-config ${k}=${v}`);
await sleep(2000);
send('exit');
await sleep(1500);
gp.kill();

const files = await fs.readdir(work).catch(() => []);
transcript += `\n${stamp()} Archivos creados por capture-preview: ${files.join(', ') || '(ninguno)'}\n`;
await fs.writeFile(OUT, transcript);
console.log(`\n📄 Transcripción guardada en ${OUT}`);
console.log('   Cópiala con:  pbcopy < prueba-shell.txt   y pégala en el chat.');
process.exit(0);
