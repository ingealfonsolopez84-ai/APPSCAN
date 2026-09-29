import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

// Sesión continua con la cámara usando `gphoto2 --shell`.
//
// Las Sony (probado con ZV-E10) ignoran o reportan valores incompletos si cada
// comando abre una sesión USB nueva. Aquí mantenemos un solo proceso abierto y
// le mandamos comandos uno por uno, esperando el prompt entre cada uno:
//   gphoto2: {/carpeta/local} />
const PROMPT = /gphoto2: \{[^\n]*\} [^\n]*> $/;
const OVERWRITE = /Overwrite\? \[y\|n\] $/;

export class GphotoShell {
  constructor({ bin = 'gphoto2', port, env } = {}) {
    this.bin = bin;
    this.port = port;
    this.env = env;
    this.proc = null;
    this.queue = Promise.resolve();
    this.pending = null;
    this.out = '';
    this.err = '';
    this.dir = null;
  }

  async start() {
    this.dir ||= await fs.mkdtemp(path.join(os.tmpdir(), 'estudio-gphoto-'));
    const args = [...(this.port ? ['--port', this.port] : []), '--shell'];
    const proc = spawn(this.bin, args, { cwd: this.dir, env: this.env });
    this.proc = proc;
    this.out = '';
    this.err = '';
    proc.stdout.on('data', (d) => { this.out += d.toString(); this.check(); });
    proc.stderr.on('data', (d) => { this.err += d.toString(); });
    proc.on('error', (e) => this.fail(e));
    proc.on('exit', () => {
      if (this.proc === proc) this.proc = null;
      this.fail(new Error('gphoto2 se cerró (¿se desconectó la cámara?)'));
    });
    // Espera el primer prompt.
    await new Promise((resolve, reject) => {
      this.pending = { resolve, reject, timer: setTimeout(() => this.timeout(), 20000) };
      this.check();
    });
  }

  check() {
    const p = this.pending;
    if (!p) return;
    if (OVERWRITE.test(this.out)) { // no debería pasar (borramos antes), pero por si acaso
      this.out = this.out.replace(OVERWRITE, '');
      this.proc?.stdin.write('y\n');
      return;
    }
    if (!PROMPT.test(this.out)) return;
    const output = this.out.replace(PROMPT, '');
    const errors = this.err;
    this.out = '';
    this.err = '';
    this.pending = null;
    clearTimeout(p.timer);
    const bad = errors.split('\n').find((l) => /\*\*\*|Error|error/.test(l));
    if (bad) p.reject(new Error(bad.replace(/\*+/g, '').trim()));
    else p.resolve(output);
  }

  fail(e) {
    const p = this.pending;
    if (!p) return;
    this.pending = null;
    clearTimeout(p.timer);
    p.reject(e);
  }

  timeout() {
    this.fail(new Error('La cámara no respondió a tiempo'));
    this.proc?.kill();
    this.proc = null;
  }

  // Ejecuta un comando del shell (p. ej. "get-config iso") y devuelve su salida.
  exec(cmd, { timeout = 15000 } = {}) {
    const job = async () => {
      if (!this.proc) await this.start();
      return new Promise((resolve, reject) => {
        this.pending = { resolve, reject, timer: setTimeout(() => this.timeout(), timeout) };
        this.proc.stdin.write(`${cmd}\n`);
      });
    };
    const p = this.queue.then(job, job);
    this.queue = p.catch(() => {});
    return p;
  }

  // Vista previa: guarda capture_preview.jpg en la carpeta de trabajo y lo lee.
  async preview() {
    const job = async () => {
      if (!this.proc) await this.start();
      await fs.rm(path.join(this.dir, 'capture_preview.jpg'), { force: true });
      await new Promise((resolve, reject) => {
        this.pending = { resolve, reject, timer: setTimeout(() => this.timeout(), 8000) };
        this.proc.stdin.write('capture-preview\n');
      });
      return fs.readFile(path.join(this.dir, 'capture_preview.jpg'));
    };
    const p = this.queue.then(job, job);
    this.queue = p.catch(() => {});
    return p;
  }

  close() {
    if (!this.proc) return;
    this.proc.stdin.write('exit\n');
    const proc = this.proc;
    setTimeout(() => proc.kill(), 1000);
    this.proc = null;
  }
}
