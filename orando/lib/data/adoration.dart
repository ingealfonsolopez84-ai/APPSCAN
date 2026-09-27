/// Guion para los "15 minutos ante el Santísimo": una serie de momentos
/// (adorar, agradecer, pedir perdón, ofrecer, contemplar) que acompañan
/// el tiempo de adoración eucarística.

class AdorationMoment {
  final String title;
  final String text;
  const AdorationMoment({required this.title, required this.text});
}

/// Una oración larga (título + párrafos + nota opcional) para rezar despacio.
class AdorationPrayer {
  final String title;
  final List<String> paragraphs;
  final String? note;
  const AdorationPrayer({required this.title, required this.paragraphs, this.note});
}

class Adoration {
  Adoration._();

  /// Jaculatoria de entrada.
  static const String jaculatoria =
      'Viva Jesús Sacramentado, viva y de todos sea muy amado.';

  /// Oraciones para rezar en los 15 minutos ante el Santísimo.
  static const List<AdorationPrayer> prayers = [
    AdorationPrayer(
      title: 'Acto de Consagración y Desagravio al Sagrado Corazón de Jesús',
      paragraphs: [
        '¡Oh Corazón de Jesús! Quiero consagrarme a ti con todo el fervor de mi espíritu. Sobre el ara del altar en que te inmolas por mi amor, deposito todo mi amor, deposito todo mi ser: mi cuerpo, que respetaré como templo en que tú habitas; mi alma, que cultivaré como jardín en que te recreas; mis sentidos, que guardaré como puertas de tentación; mis potencias, que abriré a las inspiraciones de tu gracia; mis pensamientos, que apartaré de las ilusiones del mundo; mis deseos, que pondré en la felicidad del Paraíso; mis virtudes, que florecerán a la sombra de tu protección; mis pasiones, que se someterán al freno de mis mandamientos; y el dolor de mis pecados, que detestaré mientras haya odios en mi pecho, y que lloraré sin cesar mientras haya lágrimas en mis ojos.',
        'Mi corazón quiere desde hoy ser para siempre todo tuyo, así como tú, ¡oh Corazón divino!, has querido ser siempre todo mío. Tuyo todo, tuyo siempre; no más culpas, no más tibieza. Te serviré por los que te ofenden; pensaré en ti por los que de ti se olvidan; te amaré por los que te odian; y rogaré, y gemiré, y me sacrificaré por los que blasfeman de ti sin conocerte.',
        'Tú, que penetras los corazones, y sabes la sinceridad de mis deseos, comunícame aquella gracia que hace al débil omnipotente; dame el triunfo del valor en las batallas de la tierra, y cíñeme el olivo de la paz en las mansiones de la gloria. Amén.',
      ],
    ),
    AdorationPrayer(
      title: 'Oración a San José',
      paragraphs: [
        'A vos, bienaventurado San José, acudimos en nuestra tribulación, y después de implorar el auxilio de vuestra santísima Esposa, solicitamos también confiadamente vuestro patrocinio. Por aquella caridad que con la inmaculada Virgen María, Madre de Dios, os tuvo unido, y por el paternal amor con que abrazasteis al Niño Jesús, humildemente os suplicamos que volváis benignos los ojos a la herencia que con su sangre adquirió Jesucristo, y con vuestro poder y auxilio socorráis nuestras necesidades.',
        'Proteged, oh providentísimo custodio de la Sagrada Familia, la escogida descendencia de Jesucristo; apartad de nosotros toda mancha de error y de corrupción; asistidnos propicio desde el cielo, fortísimo libertador nuestro, en esta lucha con el poder de las tinieblas; y así como en otro tiempo librasteis al Niño Jesús del inminente peligro de su vida, así ahora defended a la santa Iglesia de Dios de las asechanzas de sus enemigos y de toda adversidad; y a cada uno de nosotros protegednos con perpetuo patrocinio, para que, a ejemplo vuestro y sostenidos por vuestro auxilio, podamos vivir santamente, morir piadosamente y alcanzar en el cielo la eterna bienaventuranza. Amén.',
      ],
    ),
  ];

  static const List<AdorationMoment> moments = [
    AdorationMoment(
      title: 'Ponerse en presencia',
      text:
          'Haz la señal de la Cruz. Serénate. Jesús está aquí, vivo y verdadero en la Eucaristía. No vienes a hacer muchas cosas, sino a estar con Él. Respira despacio y dile en silencio: «Aquí estoy, Señor.»',
    ),
    AdorationMoment(
      title: 'Adorar',
      text:
          'Reconoce quién es Él y quién eres tú. «Te adoro, Jesús Sacramentado. Tú eres mi Dios y mi Señor.» Deja que tu corazón se incline ante tanto amor escondido en la Hostia.',
    ),
    AdorationMoment(
      title: 'Dar gracias',
      text:
          'Recuerda los dones de tu vida: la fe, las personas que amas, el pan de cada día, las veces que te ha sostenido. «Gracias, Señor, por todo lo que me has dado, incluso por lo que no supe ver.»',
    ),
    AdorationMoment(
      title: 'Pedir perdón',
      text:
          'Mira tu corazón con paz, sin angustia. Reconoce dónde has fallado en el amor. «Ten piedad de mí, Señor. Purifica lo que hay de sombra en mí y sáname.»',
    ),
    AdorationMoment(
      title: 'Escuchar y contemplar',
      text:
          'Ahora calla y escucha. Deja que sea Él quien te mire. No hacen falta palabras. Quédate como el discípulo amado, reclinado sobre su corazón. «Habla, Señor, que tu siervo escucha.»',
    ),
    AdorationMoment(
      title: 'Ofrecer y pedir',
      text:
          'Presenta a Jesús a las personas y necesidades que llevas dentro: tu familia, los enfermos, los que sufren, la Iglesia, el mundo. Ofrécele tu jornada y tus cruces unidas a las suyas.',
    ),
    AdorationMoment(
      title: 'Con María, despedirse',
      text:
          'Pide a la Virgen que guarde en tu corazón lo vivido. Reza un Ave María. «Quédate conmigo, Señor, para que salga de aquí llevándote a los demás.» Haz la señal de la Cruz.',
    ),
  ];

  /// Jaculatorias breves para repetir en el silencio.
  static const List<String> aspirations = [
    'Jesús, en Ti confío.',
    'Señor, quédate conmigo.',
    'Adoro tu presencia, Señor.',
    'Jesús, manso y humilde de corazón, haz mi corazón semejante al tuyo.',
    'Sólo Dios basta.',
  ];
}
