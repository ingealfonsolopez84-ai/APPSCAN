/**
 * Oremus · Demo — Contenido (datos estáticos de confianza)
 * -----------------------------------------------------------------
 * Todo este contenido lo escribimos nosotros (no proviene del usuario),
 * por eso es seguro. Se expone congelado como window.OREMUS_DATA.
 */
(function (w) {
  'use strict';

  // Iconos SVG (solo trazo; heredan color por CSS). Activos estáticos de confianza.
  const icons = {
    cross: '<svg viewBox="0 0 24 24"><path d="M12 3v16M6.5 8.5h11"/></svg>',
    heart: '<svg viewBox="0 0 24 24"><path d="M12 20c5-3 7-6.4 7-10a4.6 4.6 0 00-7-3.8A4.6 4.6 0 005 10c0 3.6 2 7 7 10z"/></svg>',
    fire: '<svg viewBox="0 0 24 24"><path d="M12 4c1.6 3 5 3.2 5 7a5 5 0 01-10 0c0-2 1-3 2.2-4C10 8 12 7 12 4z"/></svg>',
    sun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.5 5.5l1.5 1.5M17 17l1.5 1.5M18.5 5.5L17 7M7 17l-1.5 1.5"/></svg>',
    church: '<svg viewBox="0 0 24 24"><path d="M12 21c4.6-3 6.5-6.2 6.5-10a6.5 6.5 0 10-13 0c0 3.8 1.9 7 6.5 10z"/><circle cx="12" cy="11" r="2.3"/></svg>',
    host: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>',
    book: '<svg viewBox="0 0 24 24"><path d="M6 4h9l3 3v13H6z"/><path d="M9 9h6M9 12h6M9 15h4"/></svg>',
    rosary: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="6.5"/><circle cx="12" cy="4" r="1.6"/></svg>',
    pin: '<svg viewBox="0 0 24 24"><path d="M12 21c4.6-3 6.5-6.2 6.5-10a6.5 6.5 0 10-13 0c0 3.8 1.9 7 6.5 10z"/></svg>',
    home: '<svg viewBox="0 0 24 24"><path d="M4 11l8-6 8 6v8a1 1 0 01-1 1h-4v-5h-6v5H5a1 1 0 01-1-1z"/></svg>',
    star: '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M12 2l1.6 8.4L22 12l-8.4 1.6L12 22l-1.6-8.4L2 12l8.4-1.6z" fill="#e6b45a" stroke="none"/></svg>'
  };

  const AM1 = 'Dios te salve, María, llena eres de gracia; el Señor es contigo. Bendita tú eres entre todas las mujeres, y bendito es el fruto de tu vientre, Jesús.';
  const AM2 = 'Santa María, Madre de Dios, ruega por nosotros, pecadores, ahora y en la hora de nuestra muerte. Amén.';
  const PN = 'Padre nuestro, que estás en el cielo, santificado sea tu Nombre; venga a nosotros tu reino; hágase tu voluntad en la tierra como en el cielo. Danos hoy nuestro pan de cada día; perdona nuestras ofensas, como también nosotros perdonamos a los que nos ofenden; no nos dejes caer en la tentación, y líbranos del mal. Amén.';
  const GL = 'Gloria al Padre, y al Hijo, y al Espíritu Santo. Como era en el principio, ahora y siempre, por los siglos de los siglos. Amén.';
  const FA = 'Oh Jesús mío, perdónanos nuestros pecados, líbranos del fuego del infierno, lleva al cielo a todas las almas, especialmente a las más necesitadas de tu misericordia. Amén.';
  const SALVE = 'Dios te salve, Reina y Madre de misericordia, vida, dulzura y esperanza nuestra; Dios te salve… ¡Oh clemente, oh piadosa, oh dulce Virgen María!';

  const categories = [
    { id: 'fund', title: 'Fundamentales', sub: 'Padre Nuestro · Ave María · Credo', icon: 'cross', prayers: [
      { t: 'Señal de la Cruz', p: ['Por la señal de la Santa Cruz, de nuestros enemigos líbranos, Señor, Dios nuestro.', 'En el nombre del Padre, y del Hijo, y del Espíritu Santo. Amén.'] },
      { t: 'Padre Nuestro', p: [PN] },
      { t: 'Ave María', p: [AM1 + ' ' + AM2] },
      { t: 'Gloria', p: [GL] },
      { t: 'Credo de los Apóstoles', p: ['Creo en Dios, Padre todopoderoso, Creador del cielo y de la tierra.', 'Creo en Jesucristo, su único Hijo, nuestro Señor, que fue concebido por obra y gracia del Espíritu Santo, nació de Santa María Virgen, padeció bajo el poder de Poncio Pilato, fue crucificado, muerto y sepultado, descendió a los infiernos, al tercer día resucitó de entre los muertos, subió a los cielos y está sentado a la derecha de Dios, Padre todopoderoso. Desde allí ha de venir a juzgar a vivos y muertos.', 'Creo en el Espíritu Santo, la santa Iglesia católica, la comunión de los santos, el perdón de los pecados, la resurrección de la carne y la vida eterna. Amén.'] },
      { t: 'Acto de Contrición', p: ['Señor mío Jesucristo, Dios y Hombre verdadero, Creador, Padre y Redentor mío; por ser Tú quien eres, Bondad infinita, y porque te amo sobre todas las cosas, me pesa de todo corazón haberte ofendido.', 'Ayudado de tu divina gracia, propongo firmemente nunca más pecar, confesarme y cumplir la penitencia que me fuere impuesta. Amén.'] },
      { t: 'Ángel de mi Guarda', p: ['Ángel de mi guarda, dulce compañía, no me desampares ni de noche ni de día.', 'No me dejes solo, que me perdería. Amén.'] }
    ] },
    { id: 'maria', title: 'A la Virgen María', sub: 'Salve · Ángelus · Acordaos', icon: 'heart', prayers: [
      { t: 'Salve', p: ['Dios te salve, Reina y Madre de misericordia, vida, dulzura y esperanza nuestra; Dios te salve.', 'A Ti llamamos los desterrados hijos de Eva; a Ti suspiramos, gimiendo y llorando, en este valle de lágrimas.', 'Ea, pues, Señora, abogada nuestra, vuelve a nosotros esos tus ojos misericordiosos; y después de este destierro, muéstranos a Jesús, fruto bendito de tu vientre.', '¡Oh clemente, oh piadosa, oh dulce Virgen María! Amén.'] },
      { t: 'Acordaos', p: ['Acordaos, oh piadosísima Virgen María, que jamás se ha oído decir que ninguno de los que han acudido a tu protección, implorando tu auxilio y reclamando tu socorro, haya sido desamparado de Ti.', 'Animado con esta confianza, a Ti también acudo, oh Madre, Virgen de las vírgenes. No deseches mis súplicas, antes bien, escúchalas y acógelas benignamente. Amén.'] },
      { t: 'Bajo tu amparo', p: ['Bajo tu amparo nos acogemos, Santa Madre de Dios; no deseches las súplicas que te dirigimos en nuestras necesidades; antes bien, líbranos de todo peligro, oh Virgen gloriosa y bendita. Amén.'] },
      { t: 'A San Miguel Arcángel', p: ['San Miguel Arcángel, defiéndenos en la batalla. Sé nuestro amparo contra la perversidad y asechanzas del demonio.', 'Y tú, Príncipe de la milicia celestial, arroja al infierno con el divino poder a Satanás y a los otros espíritus malignos que andan por el mundo para la perdición de las almas. Amén.'] }
    ] },
    { id: 'es', title: 'Al Espíritu Santo', sub: 'Ven Espíritu Santo', icon: 'fire', prayers: [
      { t: 'Ven, Espíritu Santo', p: ['Ven, Espíritu Santo, llena los corazones de tus fieles y enciende en ellos el fuego de tu amor.', 'Envía tu Espíritu y serán creados. Y renovarás la faz de la tierra.', 'Oh Dios, que has iluminado los corazones de tus hijos con la luz del Espíritu Santo; concédenos que, guiados por el mismo Espíritu, sintamos con rectitud y gocemos siempre de tu consuelo. Amén.'] }
    ] },
    { id: 'mn', title: 'Mañana y noche', sub: 'Ofrecimiento · bendición de la mesa', icon: 'sun', prayers: [
      { t: 'Ofrecimiento de la mañana', p: ['Señor, al comenzar este día quiero ofrecerte mis pensamientos, palabras, obras y sufrimientos, en unión con tu Hijo Jesucristo.', 'Te ofrezco todo lo que haga y viva hoy, por tu mayor gloria y por la salvación de las almas. María, Madre mía, acompáñame en esta jornada. Amén.'] },
      { t: 'Oración de la noche', p: ['Señor, antes de dormir te doy gracias por este día y por todo el bien que me has dado. Perdona lo que en él te haya ofendido.', 'Te encomiendo mi descanso y el de todos mis seres queridos. Que tus ángeles nos guarden esta noche. Amén.'] },
      { t: 'Bendición de la mesa', p: ['Bendícenos, Señor, y bendice estos alimentos que por tu bondad vamos a recibir. Da pan a los que tienen hambre, y hambre de Ti a los que tenemos pan. Por Jesucristo, nuestro Señor. Amén.'] }
    ] },
    { id: 'misa', title: 'Santa Misa', sub: 'Antes y después · comunión', icon: 'church', prayers: [
      { t: 'Oración antes de la Misa', p: ['Señor Jesús, me dispongo a participar en el santo sacrificio de tu Misa. Ayúdame a dejar fuera las prisas y preocupaciones, y a estar aquí de todo corazón.', 'Que sepa escuchar tu Palabra, unirme a tu ofrenda y recibirte con fe y amor en la Comunión. María, ayúdame a vivir esta Misa como si fuera la única de mi vida. Amén.'] },
      { t: 'Comunión espiritual', p: ['Creo, Jesús mío, que estás realmente presente en el Santísimo Sacramento del altar. Te amo sobre todas las cosas y deseo recibirte dentro de mi alma.', 'Ya que ahora no puedo recibirte sacramentalmente, ven al menos espiritualmente a mi corazón. Como si ya te hubiese recibido, te abrazo y me uno del todo a Ti; no permitas que jamás me separe de Ti. Amén.'] },
      { t: 'Alma de Cristo', p: ['Alma de Cristo, santifícame. Cuerpo de Cristo, sálvame. Sangre de Cristo, embriágame. Agua del costado de Cristo, lávame.', 'Pasión de Cristo, confórtame. ¡Oh, buen Jesús!, óyeme. Dentro de tus llagas, escóndeme. No permitas que me aparte de Ti.', 'En la hora de mi muerte, llámame. Y mándame ir a Ti, para que con tus santos te alabe por los siglos de los siglos. Amén.'] },
      { t: 'Después de comulgar', p: ['Jesús, gracias por venir a mi corazón. Quédate conmigo, porque sin Ti me pierdo. Que tu presencia me transforme y salga de esta Misa dispuesto a amar como Tú amas.', 'Bendice a mi familia, a los que sufren y a los que me han pedido oración. Que un día pueda contemplarte cara a cara. Amén.'] }
    ] },
    { id: 'sant', title: 'Ante el Santísimo', sub: 'Visita y adoración', icon: 'host', prayers: [
      { t: 'Visita al Santísimo', p: ['Jesús Sacramentado, creo que estás aquí, verdaderamente presente en la Eucaristía. Vengo a hacerte compañía y a dejarme mirar por Ti.', 'Te adoro, te doy gracias, te pido perdón y te presento mi vida. No necesito muchas palabras: me basta estar contigo. Amén.'] }
    ] }
  ];

  const mysteries = {
    gozosos: { name: 'Misterios Gozosos', days: 'Lunes y sábado', list: [
      ['La Encarnación del Hijo de Dios', 'Lucas 1, 26-38'], ['La Visitación a Santa Isabel', 'Lucas 1, 39-56'],
      ['El Nacimiento de Jesús en Belén', 'Lucas 2, 1-20'], ['La Presentación en el templo', 'Lucas 2, 22-39'],
      ['El Niño Jesús hallado en el templo', 'Lucas 2, 41-52']] },
    luminosos: { name: 'Misterios Luminosos', days: 'Jueves', list: [
      ['El Bautismo de Jesús en el Jordán', 'Mateo 3, 13-17'], ['Las bodas de Caná', 'Juan 2, 1-11'],
      ['El anuncio del Reino de Dios', 'Marcos 1, 14-15'], ['La Transfiguración', 'Lucas 9, 28-36'],
      ['La institución de la Eucaristía', 'Lucas 22, 14-20']] },
    dolorosos: { name: 'Misterios Dolorosos', days: 'Martes y viernes', list: [
      ['La oración en el huerto', 'Lucas 22, 39-46'], ['La flagelación del Señor', 'Juan 19, 1'],
      ['La coronación de espinas', 'Mateo 27, 27-31'], ['Jesús con la cruz a cuestas', 'Lucas 23, 26-32'],
      ['La crucifixión y muerte de Jesús', 'Juan 19, 17-30']] },
    gloriosos: { name: 'Misterios Gloriosos', days: 'Miércoles y domingo', list: [
      ['La Resurrección del Señor', 'Mateo 28, 1-10'], ['La Ascensión del Señor', 'Hechos 1, 6-11'],
      ['La venida del Espíritu Santo', 'Hechos 2, 1-13'], ['La Asunción de María', 'Apocalipsis 12, 1'],
      ['La coronación de María', 'Judit 15, 9-10']] }
  };

  const guide = [
    ['La señal de la Cruz', 'Toma el crucifijo y haz la señal de la Cruz. Puedes rezar el Credo.'],
    ['Padre Nuestro y tres Ave Marías', 'Un Padre Nuestro, tres Ave Marías (fe, esperanza y caridad) y un Gloria.'],
    ['Enuncia el misterio', 'Según el día, di el misterio y medita. Reza un Padre Nuestro.'],
    ['Diez Ave Marías', 'En las diez cuentas de la decena reza un Ave María contemplando el misterio.'],
    ['Gloria y jaculatoria', 'Al terminar la decena, un Gloria y la oración de Fátima.'],
    ['Repite los cinco misterios', 'Continúa igual hasta completar las cinco decenas.'],
    ['Oraciones finales', 'Termina con la Salve. Haz la señal de la Cruz.']
  ];

  const adoration = [
    ['Ponerse en presencia', 'Haz la señal de la Cruz. Serénate. Jesús está aquí, vivo y verdadero. No vienes a hacer cosas, sino a estar con Él. Dile: «Aquí estoy, Señor.»'],
    ['Adorar', '«Te adoro, Jesús Sacramentado. Tú eres mi Dios y mi Señor.» Deja que tu corazón se incline ante tanto amor escondido en la Hostia.'],
    ['Dar gracias', 'Recuerda los dones de tu vida: la fe, quienes amas, el pan de cada día. «Gracias, Señor, por todo lo que me has dado.»'],
    ['Pedir perdón', 'Mira tu corazón con paz. «Ten piedad de mí, Señor. Purifica lo que hay de sombra en mí y sáname.»'],
    ['Escuchar y contemplar', 'Ahora calla y escucha. Deja que sea Él quien te mire. «Habla, Señor, que tu siervo escucha.»'],
    ['Ofrecer y pedir', 'Presenta a Jesús tu familia, los enfermos, la Iglesia, el mundo. Ofrécele tu jornada unida a la suya.'],
    ['Con María, despedirse', 'Reza un Ave María. «Quédate conmigo, Señor, para que salga llevándote a los demás.» Haz la señal de la Cruz.']
  ];

  const verses = [
    ['«Venid a mí todos los que estáis cansados y agobiados, y yo os aliviaré.»', 'Mateo 11, 28'],
    ['«El Señor es mi pastor, nada me falta.»', 'Salmo 23, 1'],
    ['«Todo lo puedo en Aquel que me conforta.»', 'Filipenses 4, 13'],
    ['«No temas, porque yo estoy contigo.»', 'Isaías 41, 10'],
    ['«Buscad primero el Reino de Dios y su justicia.»', 'Mateo 6, 33']
  ];

  const deepFreeze = (o) => {
    if (o && typeof o === 'object') { Object.values(o).forEach(deepFreeze); Object.freeze(o); }
    return o;
  };

  w.OREMUS_DATA = deepFreeze({
    icons, categories, mysteries, guide, adoration, verses,
    prayers: { AM1, AM2, PN, GL, FA, SALVE }
  });
})(window);
