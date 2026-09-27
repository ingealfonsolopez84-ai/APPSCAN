/// Guion para los "15 minutos ante el Santísimo": una serie de momentos
/// (adorar, agradecer, pedir perdón, ofrecer, contemplar) que acompañan
/// el tiempo de adoración eucarística.

class AdorationMoment {
  final String title;
  final String text;
  const AdorationMoment({required this.title, required this.text});
}

class Adoration {
  Adoration._();

  /// Duración por defecto sugerida.
  static const Duration defaultDuration = Duration(minutes: 15);

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
