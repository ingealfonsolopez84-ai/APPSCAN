import { stepValue, snapValue, SETTING_KEYS } from '../settings.js';

// Interfaz que implementan todos los drivers de cámara.
//
//  preview: 'mjpeg'  -> el servidor entrega frames JPEG (driver.frame())
//           'webcam' -> la vista previa la toma el navegador (UVC / capturadora HDMI)
export class CameraDriver {
  constructor(config) {
    this.config = config;
    this.id = config.id;
    this.name = config.name || config.id;
    this.preview = 'webcam';
    this.caps = { record: true, zoom: false, focus: false, settings: SETTING_KEYS };
    this.state = {
      connected: false,
      model: this.name,
      lens: '',
      recording: false,
      recordingSince: null,
      battery: null,
      storage: null,
      temperature: null,
      zoom: null,
      message: 'Sin conectar',
      settings: {},
      lastClips: [],
    };
  }

  async connect() {}
  async refresh() { return this.state; }

  // Implementar en cada driver: aplica un valor ya validado.
  async applySetting(_key, _value) { throw new Error('No soportado'); }
  async record(_start) { throw new Error('No soportado'); }
  async zoom(_direction, _start) { throw new Error('Zoom no soportado en esta cámara'); }
  async focus(_action) { throw new Error('Enfoque remoto no soportado en esta cámara'); }
  async frame() { return null; }

  async set(key, { value, step }) {
    const setting = this.state.settings[key];
    if (!setting) throw new Error(`Ajuste "${key}" no disponible`);
    const target = step != null ? stepValue(key, setting, Number(step)) : snapValue(key, setting, value);
    if (String(target) === String(setting.value)) return this.state;
    await this.applySetting(key, target);
    setting.value = String(target);
    return this.state;
  }

  publicInfo() {
    return { id: this.id, name: this.name, driver: this.config.driver, preview: this.preview, caps: this.caps };
  }
}
