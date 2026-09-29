import { execFile } from 'node:child_process';
import { CameraDriver } from './base.js';
import { GphotoShell } from './gphoto2-shell.js';

// Sony (y muchas otras marcas) por USB usando gphoto2.
//
// Requisitos: gphoto2 instalado (macOS: `brew install gphoto2`) y la cámara
// en modo USB "Control remoto PC" / "PC Remote".
//
// Por defecto usa una sesión continua (`gphoto2 --shell`): con la ZV-E10 es la
// única forma fiable de cambiar ajustes, y la vista previa sube de ~2 a ~10 fps.
// Con "useShell": false en la configuración vuelve a un proceso por comando.
// En ambos modos los comandos pasan por una cola (el USB admite uno a la vez).

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
  focusmode: ['focusmode'],
  lens: ['lensname', 'lens'],
  model: ['cameramodel', 'model'],
  // Propiedades Sony sin nombre en gphoto2 (aparecen como /main/other/dXXX).
  recStatus: ['d21d'], // Estado de grabación de película (1 = grabando)
  mediaTime: ['d24a'], // Tiempo de grabación restante en SLOT1 (segundos)
  overheat: ['d251'], // Estado de sobrecalentamiento (0 normal, 1 aviso, 2 sobrecalentada)
  zoomOp: ['d2dd'], // Operación de zoom motorizado (experimental)
};

// Forzamos gphoto2 en inglés: los valores ("Auto ISO", "Choose Color Temperature"...)
// no cambian con el idioma del sistema y el portal los reconoce siempre.
const GP_ENV = { ...process.env, LANG: 'C', LC_ALL: 'C', LANGUAGE: 'C' };
const KELVIN_MODE = /temp|tamp|kelvin/i;
const OVERHEAT = { 0: 'Normal', 1: 'Calentándose', 2: 'Sobrecalentada' };

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
    this.shell = config.useShell === false ? null : new GphotoShell({ bin: this.bin, port: this.port, env: GP_ENV });
  }

  // Traduce los argumentos estilo línea de comandos a comandos del shell.
  async runShell(args) {
    if (args[0] === '--capture-preview') return this.shell.preview();
    if (args[0] === '--list-config') return this.shell.exec('list-config');
    if (args[0] === '--storageinfo') throw new Error('storageinfo no disponible en sesión continua');
    let out = '';
    for (let i = 0; i < args.length; i += 2) {
      const flag = args[i];
      if (flag !== '--get-config' && flag !== '--set-config') throw new Error(`Comando no soportado: ${flag}`);
      if (flag === '--set-config') {
        out += await this.shell.exec(`set-config ${args[i + 1]}`);
        continue;
      }
      // Si una lectura falla seguimos con las demás (un bloque vacío mantiene el orden).
      out += await this.shell.exec(`get-config ${args[i + 1]}`)
        .catch(() => '\nLabel: (error)\nReadonly: 1\nType: RADIO\nCurrent: (null)\nEND\n');
    }
    return out;
  }

  close() { this.shell?.close(); }

  run(args, { binary = false, timeout = 15000 } = {}) {
    if (this.shell) {
      return this.runShell(args).catch(async (e) => {
        // En macOS ptpcamerad puede volver a tomar la cámara: la liberamos y reintentamos.
        if (process.platform !== 'darwin' || !/claim|busy|lock|cerró/i.test(e.message)) throw e;
        this.shell.close();
        await releaseMacPtp();
        return this.runShell(args);
      });
    }
    const full = [...(this.port ? ['--port', this.port] : []), ...args];
    const job = () => new Promise((resolve, reject) => {
      execFile(this.bin, full, { encoding: binary ? 'buffer' : 'utf8', timeout, maxBuffer: 32 * 1024 * 1024, env: GP_ENV },
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
      // El "zoom" que expone Sony es de solo lectura; el zoom motorizado por
      // la propiedad d2dd aún no está verificado, así que va detrás de una opción.
      this.caps.zoom = Boolean(this.config.experimentalZoom && this.names.zoomOp);
      this.caps.record = Boolean(this.names.movie);
      this.state.connected = true;
      this.state.message = 'Lista para grabar';
      // La Sony va entregando sus ajustes poco a poco al abrir la sesión; los
      // valores incompletos se corrigen solos en los siguientes refrescos.
      if (this.shell) await new Promise((r) => setTimeout(r, 2500));
      await this.refresh(true);
      for (let i = 0; i < 3 && this.hasIncomplete(); i++) {
        await new Promise((r) => setTimeout(r, 1500));
        await this.refresh();
      }
    } catch (e) {
      this.shell?.close();
      this.state.connected = false;
      this.state.message = `No encuentro la cámara por USB: ${e.message}`;
    }
  }

  async refresh(full = false) {
    if (!this.state.connected) return this.state;
    // Leer todo en una sola llamada para no bloquear la cola.
    const wanted = full
      ? Object.values(this.names)
      : ['iso', 'aperture', 'shutter', 'wb', 'whitebalance', 'ev', 'battery', 'recStatus', 'mediaTime', 'overheat']
        .map((k) => this.names[k]).filter(Boolean);
    try {
      const args = wanted.flatMap((n) => ['--get-config', n]);
      // --get-config imprime el bloque sin la ruta; la añadimos para poder separar.
      const out = await this.run(args);
      const blocks = this.parseMulti(out, wanted);
      for (const key of ['iso', 'aperture', 'shutter', 'wb', 'ev']) {
        const b = blocks[this.names[key]];
        if (!b) continue;
        const choices = b.choices.length ? b.choices : rangeChoices(b);
        // Al abrir sesión la Sony a veces reporta "(null)" o una sola opción: lo ignoramos.
        const incomplete = b.current === '(null)' || (b.type === 'RADIO' && choices.length < 2);
        const stored = this.state.settings[key];
        if (incomplete && stored && stored.value !== '(null)') continue;
        this.state.settings[key] = { value: b.current, choices, readonly: b.readonly === '1' || incomplete };
      }
      // En Sony los Kelvin son de solo lectura hasta elegir el modo "temperatura de
      // color"; applySetting lo cambia solo, así que el ajuste sí es editable.
      const wbMode = blocks[this.names.whitebalance];
      if (this.state.settings.wb && wbMode?.choices.some((c) => KELVIN_MODE.test(c))) {
        this.state.settings.wb.readonly = false;
        this.state.settings.wb.mode = wbMode.current;
      }
      const rec = blocks[this.names.recStatus];
      if (rec) {
        const recording = rec.current === '1';
        if (recording !== this.state.recording) {
          this.state.recording = recording;
          this.state.recordingSince = recording ? (this.state.recordingSince || Date.now()) : null;
          this.state.message = recording ? 'Grabando' : 'Lista para grabar';
        }
      }
      const media = blocks[this.names.mediaTime];
      if (media && Number.isFinite(Number(media.current))) {
        this.state.storage = { ...(this.state.storage || {}), recordableMinutes: Math.floor(Number(media.current) / 60) };
      }
      const heat = blocks[this.names.overheat];
      if (heat) this.state.temperature = OVERHEAT[heat.current] || heat.current;
      const bat = blocks[this.names.battery];
      if (bat) this.state.battery = Number(String(bat.current).replace(/[^0-9.]/g, '')) || null;
      if (full) {
        const model = blocks[this.names.model];
        const lens = blocks[this.names.lens];
        if (model) this.state.model = model.current;
        if (lens) this.state.lens = lens.current;
        if (!this.state.storage && !this.shell) await this.refreshStorage();
      }
    } catch (e) {
      this.state.message = `Error leyendo ajustes: ${e.message}`;
      if (/claim|not found|No camera/i.test(e.message)) this.state.connected = false;
    }
    return this.state;
  }

  hasIncomplete() {
    return Object.values(this.state.settings).some((st) => st.value === '(null)' || st.choices.length < 2);
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
      const kelvinMode = block?.choices.find((c) => KELVIN_MODE.test(c));
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
  }

  // Experimental (Sony d2dd): 1 = tele, -1 = gran angular, 0 = detener.
  async zoom(direction, start) {
    if (!this.names.zoomOp) throw new Error('Zoom remoto no disponible');
    const v = start ? (direction === 'in' ? 1 : -1) : 0;
    await this.run(['--set-config', `${this.names.zoomOp}=${v}`]);
  }

  async getBlock(name) {
    const out = await this.run(['--get-config', name]);
    return parseConfigBlocks(`/${name}\n${out}`)[name];
  }

  async focus(action) {
    const fm = this.names.focusmode;
    if (action === 'af') {
      // Vuelve a autoenfoque si estaba en manual y hace un "medio disparo".
      if (fm) {
        const b = await this.getBlock(fm);
        const af = b?.choices.find((c) => /AF-C|continuous/i.test(c)) || b?.choices.find((c) => /AF/.test(c));
        if (af && /manual|^MF$/i.test(b.current)) await this.run(['--set-config', `${fm}=${af}`]);
      }
      if (this.names.autofocus) {
        await this.run(['--set-config', `${this.names.autofocus}=1`]);
        setTimeout(() => this.run(['--set-config', `${this.names.autofocus}=0`]).catch(() => {}), 800);
      }
      return;
    }
    if (!this.names.manualfocus) throw new Error('Esta cámara no expone enfoque manual por USB');
    // El enfoque paso a paso solo actúa en modo manual (MF).
    if (fm) {
      const b = await this.getBlock(fm);
      const mf = b?.choices.find((c) => /^manual$|^MF$/i.test(c));
      if (mf && b.current !== mf) await this.run(['--set-config', `${fm}=${mf}`]);
    }
    const block = await this.getBlock(this.names.manualfocus);
    const amount = { near2: 6, near: 2, far: 2, far2: 6 }[action] || 2;
    const sign = action.startsWith('near') ? -1 : 1;
    let value;
    if (block?.choices.length) {
      // Algunas cámaras usan nombres: "Near 1..3" / "Far 1..3".
      const dir = sign < 0 ? 'Near' : 'Far';
      value = block.choices.find((c) => c.toLowerCase() === `${dir} ${amount > 2 ? 3 : 1}`.toLowerCase());
    }
    if (!value) {
      const lo = Number(block?.bottom ?? -7); const hi = Number(block?.top ?? 7);
      value = String(Math.max(lo, Math.min(hi, sign * amount)));
    }
    await this.run(['--set-config', `${this.names.manualfocus}=${value}`]);
  }

  async frame() {
    if (!this.state.connected) return null;
    return this.run(['--capture-preview', '--stdout'], { binary: true, timeout: 5000 });
  }
}
