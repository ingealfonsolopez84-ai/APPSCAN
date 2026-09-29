import { CameraDriver } from './base.js';

// DJI Osmo Action (3 / 4 / 5 Pro) en modo cámara web por USB-C (UVC).
//
// DJI no ofrece una API pública para cambiar ISO/velocidad de las Osmo Action
// desde una computadora. Lo que sí funciona de forma fiable:
//   * Conectarla por USB-C y elegir "Cámara web" en la cámara -> el navegador la
//     ve como una webcam (vista previa 1080p y grabación desde el propio portal).
//   * Los ajustes de imagen se fijan en la cámara antes de pasar a modo webcam.
// El control de grabación a la microSD por Bluetooth (protocolo del repo
// dji-sdk/Osmo-GPS-Controller-Demo) queda documentado como siguiente paso.
export class DjiOsmoDriver extends CameraDriver {
  constructor(config) {
    super(config);
    this.preview = 'webcam';
    // 'browser' = el portal graba el stream de la webcam con MediaRecorder.
    this.caps = { record: 'browser', zoom: false, focus: false, settings: [] };
  }

  async connect() {
    Object.assign(this.state, {
      connected: true,
      model: this.config.model || 'DJI Osmo Action',
      lens: 'Modo cámara web (UVC)',
      message: 'Elige la Osmo en "Fuente de video" para verla',
    });
  }
}
