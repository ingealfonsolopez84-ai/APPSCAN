import http from 'node:http';
import { CameraDriver } from './base.js';
import { DEFAULT_CHOICES } from '../settings.js';

// Sony por Wi-Fi con la "Camera Remote API" (JSON-RPC).
// Funciona en modelos con la app "Smart Remote Control" / Imaging Edge Mobile
// antigua: a5100, a6000, a6300, a6500, a7 II/III (algunas), RX100 III-VI, HX, QX, FDR-X3000, etc.
// Conecta tu computadora a la red Wi-Fi de la cámara (la IP suele ser 192.168.122.1).

// Parser del stream de liveview de Sony:
//  cabecera común (8 bytes) + cabecera de payload (128 bytes) + JPEG + relleno.
export class SonyLiveviewParser {
  constructor(onFrame) {
    this.buf = Buffer.alloc(0);
    this.onFrame = onFrame;
  }

  push(chunk) {
    this.buf = Buffer.concat([this.buf, chunk]);
    for (;;) {
      if (this.buf.length < 136) return;
      if (this.buf[0] !== 0xff) { // perdimos sincronía: busca la siguiente cabecera
        const i = this.buf.indexOf(0xff, 1);
        this.buf = i < 0 ? Buffer.alloc(0) : this.buf.subarray(i);
        continue;
      }
      const type = this.buf[1];
      const ph = this.buf.subarray(8, 136);
      const size = ph.readUIntBE(4, 3);
      const padding = ph[7];
      const total = 136 + size + padding;
      if (this.buf.length < total) return;
      if (type === 0x01) this.onFrame(Buffer.from(this.buf.subarray(136, 136 + size)));
      this.buf = this.buf.subarray(total);
    }
  }
}

export class SonyWifiDriver extends CameraDriver {
  constructor(config) {
    super(config);
    this.preview = config.previewSource === 'webcam' ? 'webcam' : 'mjpeg';
    this.endpoint = config.endpoint || 'http://192.168.122.1:8080/sony/camera';
    this.rpcId = 1;
    this.lastFrame = null;
    this.liveReq = null;
    this.caps.zoom = true;
    this.caps.focus = true;
    this.evStep = 1 / 3;
  }

  async call(method, params = [], version = '1.0') {
    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method, params, id: this.rpcId++, version }),
      signal: AbortSignal.timeout(method === 'getEvent' ? 8000 : 5000),
    });
    const json = await res.json();
    if (json.error) throw new Error(`${method}: ${json.error[1] || json.error[0]}`);
    return json.result;
  }

  async connect() {
    try {
      const [apis] = await this.call('getAvailableApiList');
      if (apis.includes('startRecMode')) {
        await this.call('startRecMode');
        await new Promise((r) => setTimeout(r, 1500));
      }
      try { await this.call('setShootMode', ['movie']); } catch { /* ya en video o no soportado */ }
      this.state.connected = true;
      this.state.message = 'Lista para grabar';
      await this.refresh();
      if (this.preview === 'mjpeg') this.startLiveview().catch(() => {});
    } catch (e) {
      this.state.connected = false;
      this.state.message = `No hay conexión Wi-Fi con la cámara (${e.message})`;
    }
  }

  async startLiveview() {
    const [url] = await this.call('startLiveview');
    this.liveReq?.destroy();
    const parser = new SonyLiveviewParser((jpg) => { this.lastFrame = jpg; });
    this.liveReq = http.get(url, (res) => {
      res.on('data', (c) => parser.push(c));
      res.on('end', () => { this.liveReq = null; });
    });
    this.liveReq.on('error', () => { this.liveReq = null; });
  }

  async frame() {
    if (!this.liveReq && this.state.connected) this.startLiveview().catch(() => {});
    return this.lastFrame;
  }

  async refresh() {
    if (!this.state.connected) return this.state;
    let result;
    try {
      result = await this.call('getEvent', [false], '1.0');
    } catch (e) {
      this.state.message = `Sin respuesta de la cámara: ${e.message}`;
      return this.state;
    }
    const byType = {};
    for (const entry of result.flat()) if (entry && entry.type) byType[entry.type] = entry;

    const st = byType.cameraStatus?.cameraStatus;
    if (st) {
      this.state.recording = st === 'MovieRecording';
      this.state.message = { IDLE: 'Lista para grabar', MovieRecording: 'Grabando', NotReady: 'No está lista' }[st] || st;
    }
    const iso = byType.isoSpeedRate;
    if (iso) this.state.settings.iso = { value: iso.currentIsoSpeedRate, choices: iso.isoSpeedRateCandidates };
    const f = byType.fNumber;
    if (f) this.state.settings.aperture = { value: f.currentFNumber, choices: f.fNumberCandidates };
    const ss = byType.shutterSpeed;
    if (ss) this.state.settings.shutter = { value: ss.currentShutterSpeed, choices: ss.shutterSpeedCandidates };
    const wb = byType.whiteBalance;
    if (wb) {
      this.state.settings.wb = {
        value: String(wb.currentColorTemperature > 0 ? wb.currentColorTemperature : 5600),
        choices: DEFAULT_CHOICES.wb,
        mode: wb.currentWhiteBalanceMode,
      };
    }
    const ev = byType.exposureCompensation;
    if (ev) {
      this.evStep = ev.stepIndexOfExposureCompensation === 2 ? 0.5 : 1 / 3;
      const toEv = (i) => { const v = Math.round(i * this.evStep * 10) / 10; return v > 0 ? `+${v}` : String(v); };
      const choices = [];
      for (let i = ev.minExposureCompensation; i <= ev.maxExposureCompensation; i++) choices.push(toEv(i));
      this.state.settings.ev = { value: toEv(ev.currentExposureCompensation), choices };
    }
    const bat = byType.batteryInfo?.batteryInfo?.[0];
    if (bat) this.state.battery = bat.levelDenom ? Math.round((bat.levelNumer / bat.levelDenom) * 100) : null;
    const sto = byType.storageInformation?.storageInformation?.[0];
    if (sto) this.state.storage = { recordableMinutes: sto.recordableTime >= 0 ? sto.recordableTime : null };
    const z = byType.zoomInformation;
    if (z) this.state.zoom = `${z.zoomPosition}%`;
    return this.state;
  }

  async applySetting(key, value) {
    switch (key) {
      case 'iso': return this.call('setIsoSpeedRate', [value]);
      case 'aperture': return this.call('setFNumber', [value]);
      case 'shutter': return this.call('setShutterSpeed', [value]);
      case 'wb': return this.call('setWhiteBalance', ['Color Temperature', true, Number(value)]);
      case 'ev': return this.call('setExposureCompensation', [Math.round(Number(value) / this.evStep)]);
      default: throw new Error(`Ajuste ${key} no soportado`);
    }
  }

  async record(start) {
    await this.call(start ? 'startMovieRec' : 'stopMovieRec');
    this.state.recording = start;
    this.state.recordingSince = start ? Date.now() : null;
  }

  async zoom(direction, start) {
    await this.call('actZoom', [direction, start ? 'start' : 'stop']);
  }

  async focus(action) {
    if (action === 'af') {
      await this.call('actHalfPressShutter');
      setTimeout(() => this.call('cancelHalfPressShutter').catch(() => {}), 1200);
      return;
    }
    throw new Error('La API Wi-Fi de Sony solo permite AF (sin enfoque manual paso a paso)');
  }
}
