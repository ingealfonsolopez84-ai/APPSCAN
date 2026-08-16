/**
 * Oremus · Demo — Configuración (ES LO ÚNICO QUE DEBES EDITAR)
 * -----------------------------------------------------------------
 * Ningún dato aquí es un "secreto": son enlaces públicos de cobro y
 * contacto. Nunca pongas contraseñas, tokens ni claves de API en el
 * cliente: el navegador del visitante puede leer todo este archivo.
 *
 * Se congela con Object.freeze para que no pueda alterarse en runtime.
 */
(function (w) {
  'use strict';

  const config = {
    /* Analítica de plataforma (sin cookies) */
    analytics: {
      goatcounterCode: '' // p.ej. "oremus" -> oremus.goatcounter.com
    },

    /* Apoyo / donativos / comentarios */
    support: {
      // PayPal — elige UNA vía (prioridad: negocio > botón > paypal.me).
      paypalBusiness: '',       // tu correo de PayPal (permite concepto y monto)
      paypalHostedButtonId: '', // o el ID de un botón "Donar" de PayPal
      paypalMe: '',             // o tu usuario de PayPal.me
      currency: 'MXN',
      suggested: [50, 100, 200, 500],

      // Transferencia bancaria (opcional; vacío = oculto).
      bank: { banco: '', beneficiario: '', cuenta: '', clabe: '', concepto: 'Donativo OREMUS' },

      // Comentarios: Formspree (recomendado, no expone tu correo) o mailto.
      formspreeId: '',   // ID de https://formspree.io/f/XXXX  -> pon solo "XXXX"
      feedbackEmail: ''  // o tu correo para recibirlos por mailto
    }
  };

  // Congela en profundidad para evitar manipulación en tiempo de ejecución.
  const deepFreeze = (o) => {
    Object.keys(o).forEach((k) => { if (o[k] && typeof o[k] === 'object') deepFreeze(o[k]); });
    return Object.freeze(o);
  };

  w.OREMUS_CONFIG = deepFreeze(config);
})(window);
