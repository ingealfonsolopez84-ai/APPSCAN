'use strict';
/**
 * Oremus · Santo Rosario — skill de Amazon Alexa
 * Reza el Rosario guiado por voz. El usuario dice "siguiente" para avanzar
 * al siguiente bloque (misterio), "repite" para repetir y "detente" para salir.
 */
const Alexa = require('ask-sdk-core');
const { SETS, mysteriesForToday, buildSegments, labelForSegment } = require('./rosary');

// Detecta un conjunto de misterios mencionado por el usuario (slot o palabra suelta).
function resolveSet(handlerInput) {
  const req = handlerInput.requestEnvelope.request;
  const slots = (req.intent && req.intent.slots) || {};
  const raw = ((slots.set && slots.set.value) || '').toLowerCase();
  if (raw.includes('gozos')) return 'gozosos';
  if (raw.includes('lumin')) return 'luminosos';
  if (raw.includes('dolor')) return 'dolorosos';
  if (raw.includes('glorios')) return 'gloriosos';
  return null;
}

function startRosary(handlerInput, setId) {
  const set = SETS[setId];
  const segments = buildSegments(setId);
  const attrs = handlerInput.attributesManager.getSessionAttributes();
  attrs.setId = setId;
  attrs.i = 0;
  attrs.total = segments.length;
  handlerInput.attributesManager.setSessionAttributes(attrs);

  const speak =
    `Recemos el Santo Rosario con los ${set.name}. <break time="700ms"/> ` +
    segments[0] +
    ' <break time="700ms"/> Cuando quieras continuar, di: siguiente.';
  return handlerInput.responseBuilder
    .speak(speak)
    .reprompt('Di "siguiente" para continuar, o "detente" para terminar.')
    .getResponse();
}

function speakCurrent(handlerInput) {
  const attrs = handlerInput.attributesManager.getSessionAttributes();
  const segments = buildSegments(attrs.setId || 'gozosos');
  const i = Math.max(0, Math.min(attrs.i || 0, segments.length - 1));
  attrs.i = i;
  handlerInput.attributesManager.setSessionAttributes(attrs);

  const isLast = i === segments.length - 1;
  const tail = isLast
    ? ' <break time="500ms"/> Puedes decir "repite" o "detente".'
    : ' <break time="700ms"/> Di "siguiente" para continuar.';
  return handlerInput.responseBuilder
    .speak(segments[i] + tail)
    .reprompt(isLast ? 'Di "detente" para terminar.' : 'Di "siguiente" para continuar.')
    .getResponse();
}

const LaunchRequestHandler = {
  canHandle(h) { return Alexa.getRequestType(h.requestEnvelope) === 'LaunchRequest'; },
  handle(h) {
    const today = mysteriesForToday(new Date().getDay());
    const set = SETS[today];
    const speak =
      `Bienvenido a Oremus, el Santo Rosario. Hoy corresponden los ${set.name}. ` +
      '¿Quieres que recemos el rosario de hoy? Di: reza el rosario. ' +
      'O elige otros misterios diciendo, por ejemplo: reza los misterios dolorosos.';
    return h.responseBuilder.speak(speak)
      .reprompt('Di "reza el rosario" para comenzar.').getResponse();
  }
};

const StartRosaryIntentHandler = {
  canHandle(h) {
    return Alexa.getRequestType(h.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(h.requestEnvelope) === 'StartRosaryIntent';
  },
  handle(h) {
    const chosen = resolveSet(h) || mysteriesForToday(new Date().getDay());
    return startRosary(h, chosen);
  }
};

const NextIntentHandler = {
  canHandle(h) {
    return Alexa.getRequestType(h.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(h.requestEnvelope) === 'AMAZON.NextIntent';
  },
  handle(h) {
    const attrs = h.attributesManager.getSessionAttributes();
    if (attrs.setId == null) {
      return startRosary(h, mysteriesForToday(new Date().getDay()));
    }
    const segments = buildSegments(attrs.setId);
    if ((attrs.i || 0) >= segments.length - 1) {
      return h.responseBuilder
        .speak('Ya hemos terminado el rosario. Puedes decir "repite" o "detente". Que Dios te bendiga.')
        .reprompt('Di "detente" para terminar.').getResponse();
    }
    attrs.i = (attrs.i || 0) + 1;
    h.attributesManager.setSessionAttributes(attrs);
    return speakCurrent(h);
  }
};

const PreviousIntentHandler = {
  canHandle(h) {
    return Alexa.getRequestType(h.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(h.requestEnvelope) === 'AMAZON.PreviousIntent';
  },
  handle(h) {
    const attrs = h.attributesManager.getSessionAttributes();
    if (attrs.setId == null) return startRosary(h, mysteriesForToday(new Date().getDay()));
    attrs.i = Math.max(0, (attrs.i || 0) - 1);
    h.attributesManager.setSessionAttributes(attrs);
    return speakCurrent(h);
  }
};

const RepeatIntentHandler = {
  canHandle(h) {
    return Alexa.getRequestType(h.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(h.requestEnvelope) === 'AMAZON.RepeatIntent';
  },
  handle(h) {
    const attrs = h.attributesManager.getSessionAttributes();
    if (attrs.setId == null) return startRosary(h, mysteriesForToday(new Date().getDay()));
    return speakCurrent(h);
  }
};

const HelpIntentHandler = {
  canHandle(h) {
    return Alexa.getRequestType(h.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(h.requestEnvelope) === 'AMAZON.HelpIntent';
  },
  handle(h) {
    return h.responseBuilder
      .speak('Te guío para rezar el Santo Rosario. Di "reza el rosario" para empezar con los misterios de hoy, ' +
        'o elige otros diciendo "reza los misterios gozosos, luminosos, dolorosos o gloriosos". ' +
        'Mientras rezamos, di "siguiente" para continuar, "repite" para repetir, o "detente" para terminar.')
      .reprompt('Di "reza el rosario" para comenzar.').getResponse();
  }
};

const StopIntentHandler = {
  canHandle(h) {
    return Alexa.getRequestType(h.requestEnvelope) === 'IntentRequest' &&
      ['AMAZON.StopIntent', 'AMAZON.CancelIntent', 'AMAZON.PauseIntent'].includes(Alexa.getIntentName(h.requestEnvelope));
  },
  handle(h) {
    return h.responseBuilder.speak('Que Dios te bendiga. Hasta pronto.').withShouldEndSession(true).getResponse();
  }
};

const SessionEndedRequestHandler = {
  canHandle(h) { return Alexa.getRequestType(h.requestEnvelope) === 'SessionEndedRequest'; },
  handle(h) { return h.responseBuilder.getResponse(); }
};

const FallbackIntentHandler = {
  canHandle(h) {
    return Alexa.getRequestType(h.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(h.requestEnvelope) === 'AMAZON.FallbackIntent';
  },
  handle(h) {
    return h.responseBuilder
      .speak('Perdona, no te entendí. Di "siguiente" para continuar, "repite" para repetir, o "detente" para terminar.')
      .reprompt('Di "siguiente" para continuar.').getResponse();
  }
};

const ErrorHandler = {
  canHandle() { return true; },
  handle(h, error) {
    console.log('Error: ' + (error && error.message));
    return h.responseBuilder
      .speak('Hubo un problema. Intentemos de nuevo: di "reza el rosario".')
      .reprompt('Di "reza el rosario" para comenzar.').getResponse();
  }
};

exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    StartRosaryIntentHandler,
    NextIntentHandler,
    PreviousIntentHandler,
    RepeatIntentHandler,
    HelpIntentHandler,
    StopIntentHandler,
    FallbackIntentHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();
