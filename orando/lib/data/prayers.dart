import 'package:flutter/material.dart';
import '../models/prayer.dart';

/// Biblioteca de oraciones católicas tradicionales, organizadas por categorías.
class PrayerLibrary {
  PrayerLibrary._();

  static const List<PrayerCategory> categories = [
    _fundamentales,
    _maria,
    _espirituSanto,
    _mananaNoche,
    _misa,
    _santisimo,
  ];

  static List<Prayer> get all =>
      categories.expand((c) => c.prayers).toList(growable: false);

  static Prayer? byId(String id) {
    for (final c in categories) {
      for (final p in c.prayers) {
        if (p.id == id) return p;
      }
    }
    return null;
  }

  // ------------------------------------------------------------------
  // FUNDAMENTALES
  // ------------------------------------------------------------------
  static const _fundamentales = PrayerCategory(
    id: 'fundamentales',
    title: 'Fundamentales',
    subtitle: 'Padre Nuestro · Ave María · Credo',
    icon: Icons.add,
    prayers: [
      Prayer(
        id: 'senal-cruz',
        title: 'Señal de la Cruz',
        paragraphs: [
          'Por la señal de la Santa Cruz, de nuestros enemigos líbranos, Señor, Dios nuestro.',
          'En el nombre del Padre, y del Hijo, y del Espíritu Santo. Amén.',
        ],
        note: 'Con la que comenzamos y terminamos toda oración.',
      ),
      Prayer(
        id: 'padre-nuestro',
        title: 'Padre Nuestro',
        latinTitle: 'Pater Noster',
        paragraphs: [
          'Padre nuestro, que estás en el cielo, santificado sea tu Nombre; venga a nosotros tu reino; hágase tu voluntad en la tierra como en el cielo.',
          'Danos hoy nuestro pan de cada día; perdona nuestras ofensas, como también nosotros perdonamos a los que nos ofenden; no nos dejes caer en la tentación, y líbranos del mal. Amén.',
        ],
        note: 'La oración que nos enseñó Jesús (Mt 6, 9-13).',
      ),
      Prayer(
        id: 'ave-maria',
        title: 'Ave María',
        latinTitle: 'Ave Maria',
        paragraphs: [
          'Dios te salve, María, llena eres de gracia; el Señor es contigo. Bendita tú eres entre todas las mujeres, y bendito es el fruto de tu vientre, Jesús.',
          'Santa María, Madre de Dios, ruega por nosotros, pecadores, ahora y en la hora de nuestra muerte. Amén.',
        ],
      ),
      Prayer(
        id: 'gloria',
        title: 'Gloria',
        latinTitle: 'Gloria Patri',
        paragraphs: [
          'Gloria al Padre, y al Hijo, y al Espíritu Santo.',
          'Como era en el principio, ahora y siempre, por los siglos de los siglos. Amén.',
        ],
      ),
      Prayer(
        id: 'credo-apostolico',
        title: 'Credo de los Apóstoles',
        latinTitle: 'Symbolum Apostolorum',
        paragraphs: [
          'Creo en Dios, Padre todopoderoso, Creador del cielo y de la tierra.',
          'Creo en Jesucristo, su único Hijo, nuestro Señor, que fue concebido por obra y gracia del Espíritu Santo, nació de Santa María Virgen, padeció bajo el poder de Poncio Pilato, fue crucificado, muerto y sepultado, descendió a los infiernos, al tercer día resucitó de entre los muertos, subió a los cielos y está sentado a la derecha de Dios, Padre todopoderoso. Desde allí ha de venir a juzgar a vivos y muertos.',
          'Creo en el Espíritu Santo, la santa Iglesia católica, la comunión de los santos, el perdón de los pecados, la resurrección de la carne y la vida eterna. Amén.',
        ],
      ),
      Prayer(
        id: 'yo-confieso',
        title: 'Yo confieso',
        latinTitle: 'Confiteor',
        paragraphs: [
          'Yo confieso ante Dios todopoderoso y ante vosotros, hermanos, que he pecado mucho de pensamiento, palabra, obra y omisión.',
          'Por mi culpa, por mi culpa, por mi gran culpa.',
          'Por eso ruego a Santa María, siempre Virgen, a los ángeles, a los santos y a vosotros, hermanos, que intercedáis por mí ante Dios, nuestro Señor. Amén.',
        ],
      ),
      Prayer(
        id: 'acto-contricion',
        title: 'Acto de Contrición',
        paragraphs: [
          'Señor mío Jesucristo, Dios y Hombre verdadero, Creador, Padre y Redentor mío; por ser Tú quien eres, Bondad infinita, y porque te amo sobre todas las cosas, me pesa de todo corazón haberte ofendido.',
          'También me pesa porque puedes castigarme con las penas del infierno. Ayudado de tu divina gracia, propongo firmemente nunca más pecar, confesarme y cumplir la penitencia que me fuere impuesta. Amén.',
        ],
        note: 'Para pedir perdón, especialmente en la Confesión.',
      ),
      Prayer(
        id: 'angel-guarda',
        title: 'Ángel de mi Guarda',
        paragraphs: [
          'Ángel de mi guarda, dulce compañía, no me desampares ni de noche ni de día.',
          'No me dejes solo, que me perdería. Amén.',
        ],
      ),
    ],
  );

  // ------------------------------------------------------------------
  // A LA VIRGEN MARÍA
  // ------------------------------------------------------------------
  static const _maria = PrayerCategory(
    id: 'maria',
    title: 'A la Virgen María',
    subtitle: 'Salve · Ángelus · Acordaos',
    icon: Icons.favorite_border,
    prayers: [
      Prayer(
        id: 'salve',
        title: 'Salve',
        latinTitle: 'Salve Regina',
        paragraphs: [
          'Dios te salve, Reina y Madre de misericordia, vida, dulzura y esperanza nuestra; Dios te salve.',
          'A Ti llamamos los desterrados hijos de Eva; a Ti suspiramos, gimiendo y llorando, en este valle de lágrimas.',
          'Ea, pues, Señora, abogada nuestra, vuelve a nosotros esos tus ojos misericordiosos; y después de este destierro, muéstranos a Jesús, fruto bendito de tu vientre.',
          '¡Oh clemente, oh piadosa, oh dulce Virgen María! Ruega por nosotros, Santa Madre de Dios, para que seamos dignos de alcanzar las promesas de nuestro Señor Jesucristo. Amén.',
        ],
      ),
      Prayer(
        id: 'acordaos',
        title: 'Acordaos',
        latinTitle: 'Memorare',
        paragraphs: [
          'Acordaos, oh piadosísima Virgen María, que jamás se ha oído decir que ninguno de los que han acudido a tu protección, implorando tu auxilio y reclamando tu socorro, haya sido desamparado de Ti.',
          'Animado con esta confianza, a Ti también acudo, oh Madre, Virgen de las vírgenes, y aunque gimiendo bajo el peso de mis pecados, me atrevo a comparecer ante Ti.',
          'No deseches mis súplicas, oh Madre del Verbo divino, antes bien, escúchalas y acógelas benignamente. Amén.',
        ],
      ),
      Prayer(
        id: 'bajo-tu-amparo',
        title: 'Bajo tu amparo',
        latinTitle: 'Sub tuum praesidium',
        paragraphs: [
          'Bajo tu amparo nos acogemos, Santa Madre de Dios; no deseches las súplicas que te dirigimos en nuestras necesidades; antes bien, líbranos de todo peligro, oh Virgen gloriosa y bendita. Amén.',
        ],
        note: 'La oración mariana más antigua que se conserva (siglo III).',
      ),
      Prayer(
        id: 'angelus',
        title: 'El Ángelus',
        paragraphs: [
          'V. El Ángel del Señor anunció a María.\nR. Y concibió por obra del Espíritu Santo.\n(Ave María…)',
          'V. He aquí la esclava del Señor.\nR. Hágase en mí según tu palabra.\n(Ave María…)',
          'V. Y el Verbo de Dios se hizo carne.\nR. Y habitó entre nosotros.\n(Ave María…)',
          'V. Ruega por nosotros, Santa Madre de Dios.\nR. Para que seamos dignos de alcanzar las promesas de nuestro Señor Jesucristo.',
          'Oremos: Infunde, Señor, tu gracia en nuestras almas, para que, los que hemos conocido, por el anuncio del Ángel, la Encarnación de tu Hijo Jesucristo, lleguemos, por los méritos de su Pasión y de su Cruz, a la gloria de la Resurrección. Por el mismo Jesucristo, nuestro Señor. Amén.',
        ],
        note: 'Se reza al mediodía (y a las 6 de la mañana y de la tarde).',
      ),
      Prayer(
        id: 'regina-caeli',
        title: 'Reina del Cielo',
        latinTitle: 'Regina Caeli',
        paragraphs: [
          'Reina del cielo, alégrate; aleluya. Porque el Señor, a quien mereciste llevar en tu seno; aleluya. Ha resucitado, según su palabra; aleluya. Ruega al Señor por nosotros; aleluya.',
          'V. Gózate y alégrate, Virgen María; aleluya.\nR. Porque verdaderamente ha resucitado el Señor; aleluya.',
          'Oremos: Oh Dios, que por la Resurrección de tu Hijo, nuestro Señor Jesucristo, te has dignado dar la alegría al mundo, concédenos que, por su Madre la Virgen María, alcancemos los gozos de la vida eterna. Por el mismo Cristo, nuestro Señor. Amén.',
        ],
        note: 'Sustituye al Ángelus en el tiempo de Pascua.',
      ),
      Prayer(
        id: 'magnificat',
        title: 'Magníficat',
        paragraphs: [
          'Proclama mi alma la grandeza del Señor, se alegra mi espíritu en Dios, mi Salvador; porque ha mirado la humillación de su esclava.',
          'Desde ahora me felicitarán todas las generaciones, porque el Poderoso ha hecho obras grandes por mí: su nombre es santo, y su misericordia llega a sus fieles de generación en generación.',
          'Él hace proezas con su brazo: dispersa a los soberbios de corazón, derriba del trono a los poderosos y enaltece a los humildes, a los hambrientos los colma de bienes y a los ricos los despide vacíos.',
          'Auxilia a Israel, su siervo, acordándose de la misericordia —como lo había prometido a nuestros padres— en favor de Abrahán y su descendencia por siempre. Amén.',
        ],
        note: 'Cántico de la Virgen María (Lc 1, 46-55).',
      ),
      Prayer(
        id: 'san-miguel',
        title: 'Oración a San Miguel Arcángel',
        paragraphs: [
          'San Miguel Arcángel, defiéndenos en la batalla. Sé nuestro amparo contra la perversidad y asechanzas del demonio.',
          'Reprímale Dios, pedimos suplicantes, y tú, Príncipe de la milicia celestial, arroja al infierno con el divino poder a Satanás y a los otros espíritus malignos que andan dispersos por el mundo para la perdición de las almas. Amén.',
        ],
      ),
    ],
  );

  // ------------------------------------------------------------------
  // AL ESPÍRITU SANTO
  // ------------------------------------------------------------------
  static const _espirituSanto = PrayerCategory(
    id: 'espiritu-santo',
    title: 'Al Espíritu Santo',
    subtitle: 'Ven Espíritu Santo · Secuencia',
    icon: Icons.local_fire_department_outlined,
    prayers: [
      Prayer(
        id: 'ven-espiritu-santo',
        title: 'Ven, Espíritu Santo',
        paragraphs: [
          'Ven, Espíritu Santo, llena los corazones de tus fieles y enciende en ellos el fuego de tu amor.',
          'V. Envía tu Espíritu y serán creados.\nR. Y renovarás la faz de la tierra.',
          'Oremos: Oh Dios, que has iluminado los corazones de tus hijos con la luz del Espíritu Santo; concédenos que, guiados por el mismo Espíritu, sintamos con rectitud y gocemos siempre de tu consuelo. Por Jesucristo, nuestro Señor. Amén.',
        ],
      ),
      Prayer(
        id: 'secuencia-espiritu',
        title: 'Secuencia de Pentecostés',
        latinTitle: 'Veni, Sancte Spiritus',
        paragraphs: [
          'Ven, Espíritu Santo, y envía desde el cielo un rayo de tu luz. Ven, padre de los pobres; ven a darnos tus dones; ven a darnos tu luz.',
          'Consolador soberano, huésped del alma, dulce refrigerio. Descanso en el trabajo, alivio en el calor, consuelo en el llanto.',
          'Luz santísima, llena hasta lo más íntimo el corazón de tus fieles. Sin tu ayuda nada hay en el hombre, nada que sea bueno.',
          'Lava lo que está manchado, riega lo que es árido, cura lo que está enfermo. Doblega lo que es rígido, calienta lo que es frío, endereza lo que está torcido.',
          'Concede a tus fieles, que en Ti confían, tus siete sagrados dones. Dales el mérito de la virtud, dales una muerte santa, dales el gozo eterno. Amén. Aleluya.',
        ],
      ),
    ],
  );

  // ------------------------------------------------------------------
  // MAÑANA Y NOCHE
  // ------------------------------------------------------------------
  static const _mananaNoche = PrayerCategory(
    id: 'manana-noche',
    title: 'Mañana y noche',
    subtitle: 'Ofrecimiento · bendición de la mesa',
    icon: Icons.wb_twilight_outlined,
    prayers: [
      Prayer(
        id: 'ofrecimiento-manana',
        title: 'Ofrecimiento de la mañana',
        paragraphs: [
          'Señor, al comenzar este día quiero ofrecerte mis pensamientos, palabras, obras y sufrimientos, en unión con tu Hijo Jesucristo.',
          'Te ofrezco todo lo que haga y viva hoy, por tu mayor gloria, por la salvación de las almas y en reparación de mis pecados. María, Madre mía, acompáñame en esta jornada. Amén.',
        ],
        note: 'Para entregar el día a Dios al despertar.',
      ),
      Prayer(
        id: 'oracion-noche',
        title: 'Oración de la noche',
        paragraphs: [
          'Señor, antes de dormir te doy gracias por este día y por todo el bien que me has dado. Perdona lo que en él te haya ofendido.',
          'Te encomiendo mi descanso y el de todos mis seres queridos. Que tus ángeles nos guarden esta noche, y que mi primer pensamiento al despertar sea para Ti. Amén.',
        ],
      ),
      Prayer(
        id: 'bendicion-mesa',
        title: 'Bendición de la mesa',
        paragraphs: [
          'Bendícenos, Señor, y bendice estos alimentos que por tu bondad vamos a recibir. Da pan a los que tienen hambre, y hambre de Ti a los que tenemos pan. Por Jesucristo, nuestro Señor. Amén.',
        ],
        note: 'Antes de comer, en familia.',
      ),
      Prayer(
        id: 'accion-gracias-comida',
        title: 'Después de comer',
        paragraphs: [
          'Te damos gracias, Señor, por todos tus beneficios, a Ti que vives y reinas por los siglos de los siglos. Amén.',
        ],
      ),
    ],
  );

  // ------------------------------------------------------------------
  // SANTA MISA (antes, durante y después)
  // ------------------------------------------------------------------
  static const _misa = PrayerCategory(
    id: 'misa',
    title: 'Santa Misa',
    subtitle: 'Antes y después · comunión',
    icon: Icons.church_outlined,
    prayers: [
      Prayer(
        id: 'antes-de-misa',
        title: 'Oración antes de la Misa',
        paragraphs: [
          'Señor Jesús, me dispongo a participar en el santo sacrificio de tu Misa. Ayúdame a dejar fuera las prisas y preocupaciones, y a estar aquí de todo corazón.',
          'Que sepa escuchar tu Palabra, unirme a tu ofrenda en el altar y recibirte con fe y amor en la Comunión. María, mi Madre, ayúdame a vivir esta Misa como si fuera la primera, la única y la última de mi vida. Amén.',
        ],
        note: 'Para prepararse al llegar al templo.',
      ),
      Prayer(
        id: 'comunion-espiritual',
        title: 'Comunión espiritual',
        paragraphs: [
          'Creo, Jesús mío, que estás realmente presente en el Santísimo Sacramento del altar. Te amo sobre todas las cosas y deseo recibirte dentro de mi alma.',
          'Ya que ahora no puedo recibirte sacramentalmente, ven al menos espiritualmente a mi corazón. Como si ya te hubiese recibido, te abrazo y me uno del todo a Ti; no permitas que jamás me separe de Ti. Amén.',
        ],
        note: 'Cuando no se puede comulgar sacramentalmente.',
      ),
      Prayer(
        id: 'alma-de-cristo',
        title: 'Alma de Cristo',
        latinTitle: 'Anima Christi',
        paragraphs: [
          'Alma de Cristo, santifícame. Cuerpo de Cristo, sálvame. Sangre de Cristo, embriágame. Agua del costado de Cristo, lávame.',
          'Pasión de Cristo, confórtame. ¡Oh, buen Jesús!, óyeme. Dentro de tus llagas, escóndeme. No permitas que me aparte de Ti.',
          'Del maligno enemigo, defiéndeme. En la hora de mi muerte, llámame. Y mándame ir a Ti, para que con tus santos te alabe por los siglos de los siglos. Amén.',
        ],
        note: 'Acción de gracias tras la Comunión.',
      ),
      Prayer(
        id: 'despues-de-comulgar',
        title: 'Acción de gracias tras comulgar',
        paragraphs: [
          'Jesús, gracias por venir a mi corazón. Quédate conmigo, porque sin Ti me pierdo. Que tu presencia me transforme y salga de esta Misa dispuesto a amar como Tú amas.',
          'Te ofrezco lo que hoy viviré. Bendice a mi familia, a los que sufren y a los que me han pedido oración. Que un día pueda contemplarte cara a cara. Amén.',
        ],
      ),
      Prayer(
        id: 'oracion-despues-misa',
        title: 'Oración después de la Misa',
        paragraphs: [
          'Te doy gracias, Señor, por haberme llamado a tu mesa. Al volver a mis ocupaciones, que lleve conmigo la paz que aquí he recibido.',
          'Haz que mi vida sea también ofrenda agradable a Ti, y que en cada hermano sepa reconocer tu rostro. Amén.',
        ],
      ),
    ],
  );

  // ------------------------------------------------------------------
  // ANTE EL SANTÍSIMO
  // ------------------------------------------------------------------
  static const _santisimo = PrayerCategory(
    id: 'santisimo',
    title: 'Ante el Santísimo',
    subtitle: 'Visita y adoración eucarística',
    icon: Icons.brightness_low_outlined,
    prayers: [
      Prayer(
        id: 'visita-santisimo',
        title: 'Visita al Santísimo',
        paragraphs: [
          'Jesús Sacramentado, creo que estás aquí, verdaderamente presente en la Eucaristía. Vengo a hacerte compañía y a dejarme mirar por Ti.',
          'Te adoro, te doy gracias, te pido perdón y te presento mi vida. No necesito muchas palabras: me basta estar contigo. Enséñame a amar el silencio en tu presencia. Amén.',
        ],
      ),
      Prayer(
        id: 'tantum-ergo',
        title: 'Adorad postrados',
        latinTitle: 'Tantum Ergo',
        paragraphs: [
          'Adoremos, pues, postrados, tan grande Sacramento; que la antigua imagen ceda el paso al nuevo rito; que la fe supla la incapacidad de los sentidos.',
          'Al Padre y al Hijo sean dadas alabanza y júbilo, salud, honor, poder y bendición; y al que de uno y otro procede sea igual alabanza. Amén.',
        ],
        note: 'Himno para la bendición con el Santísimo.',
      ),
      Prayer(
        id: 'oh-sagrado-banquete',
        title: 'Oh sagrado banquete',
        paragraphs: [
          'Oh sagrado banquete, en el que Cristo es nuestra comida, se celebra el memorial de su Pasión, el alma se llena de gracia y se nos da la prenda de la gloria futura. Amén.',
        ],
      ),
    ],
  );
}
