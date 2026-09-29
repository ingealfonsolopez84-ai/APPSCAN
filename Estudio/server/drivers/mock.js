import { CameraDriver } from './base.js';
import { DEFAULT_CHOICES } from '../settings.js';

// Cámara simulada: sirve para probar la interfaz sin hardware.
// La vista previa usa la webcam del equipo.
export class MockDriver extends CameraDriver {
  constructor(config) {
    super(config);
    this.preview = 'webcam';
    this.caps.zoom = true;
    this.caps.focus = true;
    this.zoomPos = 0.5;
    this.zoomTimer = null;
  }

  async connect() {
    const s = (value, key) => ({ value, choices: DEFAULT_CHOICES[key] });
    Object.assign(this.state, {
      connected: true,
      model: this.config.model || 'Cámara simulada',
      lens: 'Lente simulado 16-50mm',
      battery: 100,
      storage: { freeBytes: 30.5e9, totalBytes: 31.9e9, bitrateMbps: 100 },
      temperature: 'Normal',
      message: 'Lista para grabar',
      settings: {
        iso: s('800', 'iso'),
        aperture: s('4', 'aperture'),
        shutter: s('1/60', 'shutter'),
        wb: s('5600', 'wb'),
        ev: s('0', 'ev'),
      },
    });
    this.state.zoom = this.zoomLabel();
  }

  zoomLabel() {
    if (this.zoomPos <= 0.02) return 'Gran angular';
    if (this.zoomPos >= 0.98) return 'Tele';
    return 'Posición intermedia';
  }

  async refresh() {
    if (this.state.recording) this.state.storage.freeBytes -= 12.5e6 * 2; // ~100 Mbps
    if (this.state.battery > 5) this.state.battery -= 0.02;
    return this.state;
  }

  async applySetting() {}

  async record(start) {
    this.state.recording = start;
    this.state.recordingSince = start ? Date.now() : null;
    this.state.message = start ? 'Grabando' : 'Lista para grabar';
    if (!start) {
      const n = this.state.lastClips.length + 1;
      this.state.lastClips.unshift(`C${String(n).padStart(4, '0')}.MP4`);
      this.state.lastClips = this.state.lastClips.slice(0, 5);
    }
  }

  async zoom(direction, start) {
    clearInterval(this.zoomTimer);
    if (!start) return;
    const d = direction === 'in' ? 0.05 : -0.05;
    this.zoomTimer = setInterval(() => {
      this.zoomPos = Math.min(1, Math.max(0, this.zoomPos + d));
      this.state.zoom = this.zoomLabel();
    }, 100);
    setTimeout(() => clearInterval(this.zoomTimer), 5000); // seguridad
  }

  async focus() {}
}
