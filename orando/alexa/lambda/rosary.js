'use strict';
/**
 * Contenido del Santo Rosario para el skill de Alexa.
 * Genera "segmentos" en SSML: cada segmento es un bloque que Alexa reza de
 * corrido (con pausas), y el usuario dice "siguiente" para avanzar al próximo.
 */

const PN = 'Padre nuestro, que estás en el cielo, santificado sea tu Nombre; venga a nosotros tu reino; hágase tu voluntad en la tierra como en el cielo. Danos hoy nuestro pan de cada día; perdona nuestras ofensas, como también nosotros perdonamos a los que nos ofenden; no nos dejes caer en la tentación, y líbranos del mal. Amén.';
const AM = 'Dios te salve, María, llena eres de gracia; el Señor es contigo. Bendita tú eres entre todas las mujeres, y bendito es el fruto de tu vientre, Jesús. <break time="600ms"/> Santa María, Madre de Dios, ruega por nosotros, pecadores, ahora y en la hora de nuestra muerte. Amén.';
const GLORIA = 'Gloria al Padre, y al Hijo, y al Espíritu Santo. Como era en el principio, ahora y siempre, por los siglos de los siglos. Amén.';
const FATIMA = 'Oh Jesús mío, perdónanos nuestros pecados, líbranos del fuego del infierno, lleva al cielo a todas las almas, especialmente a las más necesitadas de tu misericordia. Amén.';
const CREDO = 'Creo en Dios, Padre todopoderoso, Creador del cielo y de la tierra. Creo en Jesucristo, su único Hijo, nuestro Señor, que fue concebido por obra y gracia del Espíritu Santo, nació de Santa María Virgen, padeció bajo el poder de Poncio Pilato, fue crucificado, muerto y sepultado, descendió a los infiernos, al tercer día resucitó de entre los muertos, subió a los cielos y está sentado a la derecha de Dios, Padre todopoderoso. Desde allí ha de venir a juzgar a vivos y muertos. Creo en el Espíritu Santo, la santa Iglesia católica, la comunión de los santos, el perdón de los pecados, la resurrección de la carne y la vida eterna. Amén.';
const SALVE = 'Dios te salve, Reina y Madre de misericordia, vida, dulzura y esperanza nuestra; Dios te salve. A ti llamamos los desterrados hijos de Eva; a ti suspiramos, gimiendo y llorando, en este valle de lágrimas. Ea, pues, Señora, abogada nuestra, vuelve a nosotros esos tus ojos misericordiosos; y después de este destierro, muéstranos a Jesús, fruto bendito de tu vientre. ¡Oh clemente, oh piadosa, oh dulce Virgen María! Amén.';

const SETS = {
  gozosos: { name: 'Misterios Gozosos', days: 'lunes y sábado', list: [
    ['La Encarnación del Hijo de Dios', 'Contemplemos cómo el ángel anuncia a María que será Madre de Dios, y ella responde con humildad.'],
    ['La Visitación de María a su prima Isabel', 'Contemplemos a María que lleva a Jesús y sirve con caridad.'],
    ['El Nacimiento de Jesús en Belén', 'Contemplemos a Jesús que nace pobre y humilde.'],
    ['La Presentación de Jesús en el templo', 'Contemplemos a María y José que ofrecen a Jesús al Padre.'],
    ['El Niño Jesús perdido y hallado en el templo', 'Contemplemos a Jesús en la casa de su Padre.']
  ]},
  luminosos: { name: 'Misterios Luminosos', days: 'jueves', list: [
    ['El Bautismo de Jesús en el Jordán', 'El Padre proclama: este es mi Hijo amado.'],
    ['Las bodas de Caná', 'Por intercesión de María, Jesús hace su primer milagro.'],
    ['El anuncio del Reino de Dios', 'Jesús invita a la conversión y a creer en el Evangelio.'],
    ['La Transfiguración del Señor', 'Jesús muestra su gloria en el monte.'],
    ['La institución de la Eucaristía', 'Jesús se queda con nosotros en el Pan de vida.']
  ]},
  dolorosos: { name: 'Misterios Dolorosos', days: 'martes y viernes', list: [
    ['La oración de Jesús en el huerto', 'Jesús acepta la voluntad del Padre.'],
    ['La flagelación del Señor', 'Jesús padece por nuestros pecados.'],
    ['La coronación de espinas', 'Coronan de espinas al Rey del universo.'],
    ['Jesús con la cruz a cuestas', 'Jesús carga la cruz por amor.'],
    ['La crucifixión y muerte de Jesús', 'Jesús entrega su vida y nos da a María por Madre.']
  ]},
  gloriosos: { name: 'Misterios Gloriosos', days: 'miércoles y domingo', list: [
    ['La Resurrección del Señor', 'Cristo vence a la muerte.'],
    ['La Ascensión del Señor al cielo', 'Jesús sube al cielo y nos prepara un lugar.'],
    ['La venida del Espíritu Santo', 'El Espíritu llena a la Iglesia.'],
    ['La Asunción de María al cielo', 'María es llevada en cuerpo y alma al cielo.'],
    ['La coronación de María', 'María reina junto a su Hijo.']
  ]}
};

const ORDINAL = ['Primer', 'Segundo', 'Tercer', 'Cuarto', 'Quinto'];

function mysteriesForToday(weekday) {
  // weekday: 0=domingo ... 6=sábado (getDay de JS)
  if (weekday === 1 || weekday === 6) return 'gozosos';
  if (weekday === 2 || weekday === 5) return 'dolorosos';
  if (weekday === 3 || weekday === 0) return 'gloriosos';
  return 'luminosos';
}

function decade(am) {
  let s = '';
  for (let i = 0; i < 10; i++) s += AM + ' <break time="900ms"/> ';
  return s;
}

/**
 * Devuelve los segmentos del rosario para un conjunto de misterios.
 * Cada elemento es SSML que Alexa reza de corrido.
 */
function buildSegments(setId) {
  const set = SETS[setId] || SETS.gozosos;
  const segs = [];

  // Segmento 0: inicio
  segs.push(
    'Comencemos. En el nombre del Padre, y del Hijo, y del Espíritu Santo. Amén. <break time="800ms"/> ' +
    CREDO + ' <break time="900ms"/> ' +
    PN + ' <break time="800ms"/> ' +
    'Ahora, tres Ave Marías por la fe, la esperanza y la caridad. <break time="500ms"/> ' +
    AM + ' <break time="800ms"/> ' + AM + ' <break time="800ms"/> ' + AM + ' <break time="800ms"/> ' +
    GLORIA
  );

  // Segmentos 1..5: cada misterio con su decena
  set.list.forEach((m, idx) => {
    segs.push(
      `${ORDINAL[idx]} misterio. ${m[0]}. <break time="600ms"/> ${m[1]} <break time="900ms"/> ` +
      PN + ' <break time="800ms"/> ' +
      decade(AM) +
      GLORIA + ' <break time="700ms"/> ' +
      FATIMA
    );
  });

  // Segmento final: Salve
  segs.push(
    SALVE + ' <break time="700ms"/> ' +
    'Ruega por nosotros, Santa Madre de Dios, para que seamos dignos de alcanzar las promesas de nuestro Señor Jesucristo. <break time="600ms"/> ' +
    'En el nombre del Padre, y del Hijo, y del Espíritu Santo. Amén. <break time="500ms"/> ' +
    'Hemos terminado el Santo Rosario. Que Dios te bendiga.'
  );

  return segs;
}

function labelForSegment(setId, i, total) {
  if (i === 0) return 'Oraciones iniciales';
  if (i === total - 1) return 'Oraciones finales';
  return `${ORDINAL[i - 1]} misterio`;
}

module.exports = { SETS, mysteriesForToday, buildSegments, labelForSegment };
