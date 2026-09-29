import { execFile } from 'node:child_process';
import { CameraDriver } from './base.js';

// Sony (y muchas otras marcas) por USB usando gphoto2.
//
// Requisitos: gphoto2 instalado (macOS: `brew install gphoto2`) y la cámara
// en modo USB "Control remoto PC" / "PC Remote".
//
// gphoto2 solo permite un proceso a la vez sobre el USB, así que TODOS los
// comandos (ajustes, grabación y frames de vista previa) pasan por una cola.

// Nombres de configuración que usan distintas cámaras para cada ajuste.
const ALIASES = {
  iso: ['iso', 'isospeed'],
  aperture: ['f-number', 'aperture', 'fnumber'],
  shutter: ['shutterspeed', 'shutterspeed2'],
  wb: ['colortemperature', 'whitebalancecolortemperature'],
  ev: ['exposurecompensation', 'exposurebiascompensation'],
  whitebalance: ['whitebalance'],
  movie: ['movie', 'movierecord', 'movierecordtarget'],
  battery: ['batterylevel'],
  manualfocus: ['manualfocus', 'manualfocusdrive'],
  autofocus: ['autofocus', 'autofocusdrive'],
  zoom: ['zoom', 'zoomposition'],
  lens: ['lensname', 'lens'],
  model: ['cameramodel', 'model'],
};

export function parseConfigBlocks(text) {
  const blocks = {};
  let current = null;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line.startsWith('/') && !line.includes(':')) {
      current = { path: line, name: line.split('/').pop(), choices: [] };
      blocks[current.name] = current;
      continue;
    }
    if (!current) continue;
    const m = line.match(/^(\w+):\s?(.*)$/);
    if (!m) continue;
    const [, k, v] = m;
    if (k === 'Choice') current.choices.push(v.replace(/^\d+\s/, ''));
    else current[k.toLowerCase()] = v;
  }
  return blocks;
}

function rangeChoices(block) {
  const bottom = Number(block.bottom);
  const top = Number(block.top);
  const step = Number(block.step) || 1;
  if (!Number.isFinite(bottom) || !Number.isFinite(top)) return [];
  const out = [];
  const inc = Math.max(step, (top - bottom) / 200);
  for (let v = bottom; v <= top + 1e-9; v += inc) out.push(String(Math.round(v * 100) / 100));
  return out;
}

// En macOS el sistema "secuestra" la cámara por PTP; hay que liberarla.
export function releaseMacPtp() {
  return new Promise((r) => execFile('killall', ['ptpcamerad', 'PTPCamera'], () => setTimeout(r, 300)));
}

export class Gphoto2Driver extends CameraDriver {
  constructor(config) {
    super(config);
    this.preview = config.previewSource === 'webcam' ? 'webcam' : 'mjpeg';
    this.bin = config.gphoto2Path || 'gphoto2';
    this.port = config.port; // p.ej. "usb:020,007" si hay varias cámaras
    this.queue = Promise.resolve();
    this.names = {}; // ajuste lógico -> nombre real en la cámara
  }

  run(args, { binary = false, timeout = 15000 } = {}) {
    const full = [...(this.port ? ['--port', this.port] : []), ...args];
    const job = () => new Promise((resolve, reject) => {
      execFile(this.bin, full, { encoding: binary ? 'buffer' : 'utf8', timeout, maxBuffer: 32 * 1024 * 1024 },
        (err, stdout, stderr) => {
          if (err) {
            const msg = String(stderr || err.message).split('\n').find((l) => /\*\*\*|Error|error/.test(l)) || err.message;
            reject(new Error(msg.trim()));
          } else resolve(stdout);
        });
    });
    // En macOS ptpcamerad vuelve a tomar la cámara: lo cerramos y reintentamos una vez.
    const withRetry = () => job().catch(async (e) => {
      if (process.platform !== 'darwin' || !/claim|busy|Could not lock/i.test(e.message)) throw e;
      await releaseMacPtp();
      return job();
    });
    const p = this.queue.then(withRetry, withRetry);
    this.queue = p.catch(() => {});
    return p;
  }

  async connect() {
    if (process.platform === 'darwin') await releaseMacPtp();
    try {
      const list = await this.run(['--list-config']);
      const available = new Set(list.split('\n').map((l) => l.trim().split('/').pop()).filter(Boolean));
      for (const [key, names] of Object.entries(ALIASES)) {
        const found = names.find((n) => available.has(n));
        if (found) this.names[key] = found;
      }
      this.caps.settings = ['iso', 'aperture', 'shutter', 'wb', 'ev'].filter((k) => this.names[k]);
      this.caps.focus = Boolean(this.names.manualfocus || this.names.autofocus);
      this.caps.zoom = Boolean(this.names.zoom);
      this.caps.record = Boolean(this.names.movie);
      this.state.connected = true;
      this.state.message = 'Lista para grabar';
      await this.refresh(true);
    } catch (e) {
      this.state.connected = false;
      this.state.message = `No encuentro la cámara por USB: ${e.message}`;
    }
  }

  async refresh(full = false) {
    if (!this.state.connected) return this.state;
    // Leer todo en una sola llamada para no bloquear la cola.
    const wanted = full
      ? Object.values(this.names)
      : ['iso', 'aperture', 'shutter', 'wb', 'ev', 'battery', 'zoom'].map((k) => this.names[k]).filter(Boolean);
    try {
      const args = wanted.flatMap((n) => ['--get-config', n]);
      // --get-config imprime el bloque sin la ruta; la añadimos para poder separar.
      const out = await this.run(args);
      const blocks = this.parseMulti(out, wanted);
      for (const key of ['iso', 'aperture', 'shutter', 'wb', 'ev']) {
        const b = blocks[this.names[key]];
        if (!b) continue;
        const choices = b.choices.length ? b.choices : rangeChoices(b);
        this.state.settings[key] = { value: b.current, choices, readonly: b.readonly === '1' };
      }
      const bat = blocks[this.names.battery];
      if (bat) this.state.battery = Number(String(bat.current).replace(/[^0-9.]/g, '')) || null;
      const zoom = blocks[this.names.zoom];
      if (zoom) {
        this.state.zoom = zoom.current;
        this.zoomStep = Number(zoom.step) || 1;
      }
      if (full) {
        const model = blocks[this.names.model];
        const lens = blocks[this.names.lens];
        if (model) this.state.model = model.current;
        if (lens) this.state.lens = lens.current;
        await this.refreshStorage();
      }
    } catch (e) {
      this.state.message = `Error leyendo ajustes: ${e.message}`;
      if (/claim|not found|No camera/i.test(e.message)) this.state.connected = false;
    }
    return this.state;
  }

  parseMulti(out, names) {
    // Cada bloque de --get-config empieza en "Label:"; los asociamos en orden.
    const chunks = out.split(/\n(?=Label:)/).filter((c) => c.includes('Label:'));
    const blocks = {};
    chunks.forEach((chunk, i) => {
      const name = names[i];
      if (!name) return;
      blocks[name] = parseConfigBlocks(`/${name}\n${chunk}`)[name];
    });
    return blocks;
  }

  async refreshStorage() {
    try {
      const out = await this.run(['--storageinfo']);
      const total = Number((out.match(/totalcapacity=(\d+)/) || [])[1]) * 1024;
      const free = Number((out.match(/free=(\d+)/) || [])[1]) * 1024;
      if (total) this.state.storage = { totalBytes: total, freeBytes: free, bitrateMbps: this.config.bitrateMbps || 100 };
    } catch { /* algunas cámaras en modo remoto no reportan almacenamiento */ }
  }

  async applySetting(key, value) {
    const name = this.names[key];
    if (key === 'wb' && this.names.whitebalance) {
      // Asegura el modo "temperatura de color" antes de fijar los Kelvin.
      const wbOut = await this.run(['--get-config', this.names.whitebalance]);
      const block = parseConfigBlocks(`/${this.names.whitebalance}\n${wbOut}`)[this.names.whitebalance];
      const kelvinMode = block?.choices.find((c) => /temp|kelvin|^k$/i.test(c));
      if (kelvinMode && block.current !== kelvinMode) {
        await this.run(['--set-config', `${this.names.whitebalance}=${kelvinMode}`]);
      }
    }
    await this.run(['--set-config', `${name}=${value}`]);
  }

  async record(start) {
    await this.run(['--set-config', `${this.names.movie}=${start ? 1 : 0}`]);
    this.state.recording = start;
    this.state.recordingSince = start ? Date.now() : null;
    this.state.message = start ? 'Grabando' : 'Lista para grabar';
    if (!start) setTimeout(() => this.refreshStorage(), 2000);
  }

  async zoom(direction, start) {
    if (!start || !this.names.zoom) return;
    const cur = Number(this.state.zoom) || 0;
    const step = this.zoomStep || 1;
    await this.run(['--set-config', `${this.names.zoom}=${cur + (direction === 'in' ? step : -step)}`]);
  }

  async focus(action) {
    if (action === 'af' && this.names.autofocus) {
      await this.run(['--set-config', `${this.names.autofocus}=1`]);
      return;
    }
    if (!this.names.manualfocus) throw new Error('Esta cámara no expone enfoque manual por USB');
    // Sony: "Near 1..3" / "Far 1..3"; Canon: pasos numéricos con signo.
    const amount = { near2: 3, near: 1, far: 1, far2: 3 }[action] || 1;
    const dir = action.startsWith('near') ? 'Near' : 'Far';
    const out = await this.run(['--get-config', this.names.manualfocus]);
    const block = parseConfigBlocks(`/${this.names.manualfocus}\n${out}`)[this.names.manualfocus];
    const named = block?.choices.find((c) => c.toLowerCase() === `${dir} ${amount}`.toLowerCase());
    const value = named || String((dir === 'Near' ? -1 : 1) * amount * 10);
    await this.run(['--set-config', `${this.names.manualfocus}=${value}`]);
  }

  async frame() {
    if (!this.state.connected) return null;
    return this.run(['--capture-preview', '--stdout'], { binary: true, timeout: 5000 });
  }
}
