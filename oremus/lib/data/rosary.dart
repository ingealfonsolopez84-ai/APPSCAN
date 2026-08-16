/// Datos del Santo Rosario: misterios, su asignación por día de la semana
/// y los pasos para rezarlo.

class Mystery {
  final String title;
  final String reference;
  final String meditation;
  const Mystery({
    required this.title,
    required this.reference,
    required this.meditation,
  });
}

class MysterySet {
  final String id;
  final String name; // p. ej. "Misterios Gozosos"
  final String days; // p. ej. "Lunes y sábado"
  final List<Mystery> mysteries; // siempre 5
  const MysterySet({
    required this.id,
    required this.name,
    required this.days,
    required this.mysteries,
  });
}

class Rosary {
  Rosary._();

  /// Misterios recomendados según el día (esquema tradicional con los Luminosos).
  /// 1 = lunes … 7 = domingo (DateTime.weekday).
  static MysterySet forWeekday(int weekday) {
    switch (weekday) {
      case DateTime.monday:
      case DateTime.saturday:
        return gozosos;
      case DateTime.tuesday:
      case DateTime.friday:
        return dolorosos;
      case DateTime.wednesday:
      case DateTime.sunday:
        return gloriosos;
      case DateTime.thursday:
      default:
        return luminosos;
    }
  }

  static const List<MysterySet> all = [gozosos, luminosos, dolorosos, gloriosos];

  static const gozosos = MysterySet(
    id: 'gozosos',
    name: 'Misterios Gozosos',
    days: 'Lunes y sábado',
    mysteries: [
      Mystery(
        title: 'La Encarnación del Hijo de Dios',
        reference: 'Lucas 1, 26-38',
        meditation:
            'El ángel Gabriel anuncia a María que será Madre de Dios, y ella responde: «Hágase en mí según tu palabra.» Pedimos la humildad.',
      ),
      Mystery(
        title: 'La Visitación de María a su prima Isabel',
        reference: 'Lucas 1, 39-56',
        meditation:
            'María lleva a Jesús en su seno y sirve a Isabel. Pedimos la caridad con el prójimo.',
      ),
      Mystery(
        title: 'El Nacimiento del Hijo de Dios en Belén',
        reference: 'Lucas 2, 1-20',
        meditation:
            'Jesús nace pobre y humilde. Pedimos el espíritu de pobreza y el amor a la sencillez.',
      ),
      Mystery(
        title: 'La Presentación de Jesús en el templo',
        reference: 'Lucas 2, 22-39',
        meditation:
            'María y José ofrecen a Jesús al Padre. Pedimos la obediencia y la pureza de corazón.',
      ),
      Mystery(
        title: 'El Niño Jesús perdido y hallado en el templo',
        reference: 'Lucas 2, 41-52',
        meditation:
            'Jesús permanece en la casa de su Padre. Pedimos buscar siempre a Dios sobre todas las cosas.',
      ),
    ],
  );

  static const luminosos = MysterySet(
    id: 'luminosos',
    name: 'Misterios Luminosos',
    days: 'Jueves',
    mysteries: [
      Mystery(
        title: 'El Bautismo de Jesús en el Jordán',
        reference: 'Mateo 3, 13-17',
        meditation:
            'El Padre proclama: «Este es mi Hijo amado.» Pedimos vivir nuestro bautismo como hijos de Dios.',
      ),
      Mystery(
        title: 'Las bodas de Caná',
        reference: 'Juan 2, 1-11',
        meditation:
            'Por intercesión de María, Jesús hace su primer milagro. Pedimos confiar en la Virgen: «Haced lo que Él os diga.»',
      ),
      Mystery(
        title: 'El anuncio del Reino de Dios',
        reference: 'Marcos 1, 14-15',
        meditation:
            'Jesús invita a la conversión. Pedimos un corazón dispuesto a cambiar y creer en el Evangelio.',
      ),
      Mystery(
        title: 'La Transfiguración del Señor',
        reference: 'Lucas 9, 28-36',
        meditation:
            'Jesús muestra su gloria. Pedimos el deseo de las cosas del cielo.',
      ),
      Mystery(
        title: 'La institución de la Eucaristía',
        reference: 'Lucas 22, 14-20',
        meditation:
            'Jesús se queda con nosotros en el Pan de vida. Pedimos amar y adorar la Eucaristía.',
      ),
    ],
  );

  static const dolorosos = MysterySet(
    id: 'dolorosos',
    name: 'Misterios Dolorosos',
    days: 'Martes y viernes',
    mysteries: [
      Mystery(
        title: 'La oración de Jesús en el huerto',
        reference: 'Lucas 22, 39-46',
        meditation:
            'Jesús acepta la voluntad del Padre. Pedimos aceptar la voluntad de Dios en las pruebas.',
      ),
      Mystery(
        title: 'La flagelación del Señor',
        reference: 'Juan 19, 1',
        meditation:
            'Jesús padece por nuestros pecados. Pedimos la virtud de la mortificación y la pureza.',
      ),
      Mystery(
        title: 'La coronación de espinas',
        reference: 'Mateo 27, 27-31',
        meditation:
            'Coronan de espinas al Rey del universo. Pedimos humildad ante las humillaciones.',
      ),
      Mystery(
        title: 'Jesús con la cruz a cuestas camino del Calvario',
        reference: 'Lucas 23, 26-32',
        meditation:
            'Jesús carga la cruz por amor. Pedimos paciencia para llevar nuestras cruces.',
      ),
      Mystery(
        title: 'La crucifixión y muerte de Jesús',
        reference: 'Juan 19, 17-30',
        meditation:
            'Jesús entrega su vida y nos da a María por Madre. Pedimos el perdón y el amor a la cruz.',
      ),
    ],
  );

  static const gloriosos = MysterySet(
    id: 'gloriosos',
    name: 'Misterios Gloriosos',
    days: 'Miércoles y domingo',
    mysteries: [
      Mystery(
        title: 'La Resurrección del Señor',
        reference: 'Mateo 28, 1-10',
        meditation:
            'Cristo vence a la muerte. Pedimos una fe viva y la esperanza en la vida eterna.',
      ),
      Mystery(
        title: 'La Ascensión del Señor al cielo',
        reference: 'Hechos 1, 6-11',
        meditation:
            'Jesús sube al cielo y nos prepara un lugar. Pedimos el deseo del cielo.',
      ),
      Mystery(
        title: 'La venida del Espíritu Santo sobre los Apóstoles',
        reference: 'Hechos 2, 1-13',
        meditation:
            'El Espíritu llena a la Iglesia. Pedimos sus dones y el celo apostólico.',
      ),
      Mystery(
        title: 'La Asunción de María al cielo',
        reference: 'Apocalipsis 12, 1',
        meditation:
            'María es llevada en cuerpo y alma al cielo. Pedimos la gracia de una buena muerte.',
      ),
      Mystery(
        title: 'La coronación de María como Reina del cielo y la tierra',
        reference: 'Judit 15, 9-10',
        meditation:
            'María reina junto a su Hijo. Pedimos su protección maternal y la perseverancia.',
      ),
    ],
  );

  /// Oraciones que se rezan al comenzar el Rosario.
  static const List<String> opening = [
    'Por la señal de la Santa Cruz, de nuestros enemigos líbranos, Señor, Dios nuestro. En el nombre del Padre, y del Hijo, y del Espíritu Santo. Amén.',
    'Señor mío Jesucristo… (Acto de Contrición)',
    'Se rezan un Padre Nuestro, tres Ave Marías (por la fe, la esperanza y la caridad) y un Gloria.',
  ];

  /// Oraciones finales del Rosario.
  static const List<String> closing = [
    'Salve, Reina y Madre de misericordia…',
    'Ruega por nosotros, Santa Madre de Dios, para que seamos dignos de alcanzar las promesas de nuestro Señor Jesucristo.',
    'Letanías de la Virgen (opcional) y oración final.',
  ];

  /// Guía resumida de cómo se reza el Rosario.
  static const List<GuideStep> guide = [
    GuideStep(
      n: 1,
      title: 'La señal de la Cruz',
      body:
          'Toma el crucifijo y haz la señal de la Cruz. Puedes rezar el Credo sosteniéndolo.',
    ),
    GuideStep(
      n: 2,
      title: 'Padre Nuestro, tres Ave Marías y Gloria',
      body:
          'En la primera cuenta reza un Padre Nuestro; en las tres siguientes, un Ave María (por la fe, la esperanza y la caridad); luego un Gloria.',
    ),
    GuideStep(
      n: 3,
      title: 'Enuncia el primer misterio',
      body:
          'Según el día, di el misterio y medita brevemente en él. Reza un Padre Nuestro.',
    ),
    GuideStep(
      n: 4,
      title: 'Reza diez Ave Marías',
      body:
          'En cada una de las diez cuentas de la decena reza un Ave María, contemplando el misterio.',
    ),
    GuideStep(
      n: 5,
      title: 'Gloria y jaculatoria',
      body:
          'Al terminar la decena reza un Gloria y, si quieres, la oración de Fátima: «Oh Jesús mío, perdónanos nuestros pecados…».',
    ),
    GuideStep(
      n: 6,
      title: 'Repite con los cinco misterios',
      body:
          'Enuncia el segundo misterio y continúa igual hasta completar las cinco decenas.',
    ),
    GuideStep(
      n: 7,
      title: 'Oraciones finales',
      body:
          'Termina con la Salve y la oración final. Puedes añadir las letanías. Haz la señal de la Cruz.',
    ),
  ];

  static const String fatima =
      'Oh Jesús mío, perdónanos nuestros pecados, líbranos del fuego del infierno, lleva al cielo a todas las almas, especialmente a las más necesitadas de tu misericordia. Amén.';
}

class GuideStep {
  final int n;
  final String title;
  final String body;
  const GuideStep({required this.n, required this.title, required this.body});
}
