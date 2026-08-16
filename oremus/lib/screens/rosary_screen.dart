import 'package:flutter/material.dart';
import '../data/rosary.dart';
import '../theme.dart';
import '../widgets/decor.dart';

class RosaryScreen extends StatelessWidget {
  const RosaryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final today = Rosary.forWeekday(DateTime.now().weekday);
    return Scaffold(
      body: SereneBackground(
        child: SafeArea(
          child: CustomScrollView(
            slivers: [
              const SliverAppBar(
                pinned: true,
                backgroundColor: Colors.transparent,
                surfaceTintColor: Colors.transparent,
                title: Text('Santo Rosario'),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(22, 0, 22, 24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SoftCard(
                        highlight: true,
                        onTap: () => _openPray(context, today),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Kicker('Rosario de hoy'),
                            const SizedBox(height: 8),
                            Text(today.name, style: AppTheme.serifTitle(24)),
                            const SizedBox(height: 4),
                            Text(today.days,
                                style: const TextStyle(
                                    color: AppColors.inkSoft, fontSize: 13)),
                            const SizedBox(height: 16),
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 16, vertical: 10),
                                  decoration: BoxDecoration(
                                    color: AppColors.gold,
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: const Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(Icons.play_arrow_rounded,
                                          color: Colors.white, size: 20),
                                      SizedBox(width: 6),
                                      Text('Rezar guiado',
                                          style: TextStyle(
                                              color: Colors.white,
                                              fontWeight: FontWeight.w600)),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 14),
                      SoftCard(
                        onTap: () => Navigator.of(context).push(MaterialPageRoute(
                          builder: (_) => const RosaryGuideScreen(),
                        )),
                        child: const OremusRow(
                          icon: Icons.menu_book_outlined,
                          title: 'Cómo se reza, paso a paso',
                          subtitle: 'Con las oraciones y qué misterios según el día',
                        ),
                      ),
                      const SizedBox(height: 24),
                      const Kicker('Todos los misterios'),
                      const SizedBox(height: 10),
                      ...Rosary.all.map((set) => Padding(
                            padding: const EdgeInsets.only(bottom: 10),
                            child: SoftCard(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 16, vertical: 4),
                              onTap: () => _openPray(context, set),
                              child: OremusRow(
                                icon: Icons.brightness_7_outlined,
                                title: set.name,
                                subtitle: set.days,
                              ),
                            ),
                          )),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _openPray(BuildContext context, MysterySet set) {
    Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => RosaryPrayScreen(set: set),
    ));
  }
}

// ---------------------------------------------------------------------------
// Guía paso a paso
// ---------------------------------------------------------------------------
class RosaryGuideScreen extends StatelessWidget {
  const RosaryGuideScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SereneBackground(
        child: SafeArea(
          child: CustomScrollView(
            slivers: [
              const SliverAppBar(
                pinned: true,
                backgroundColor: Colors.transparent,
                surfaceTintColor: Colors.transparent,
                title: Text('Cómo rezar el Rosario'),
              ),
              SliverList.builder(
                itemCount: Rosary.guide.length,
                itemBuilder: (context, i) {
                  final step = Rosary.guide[i];
                  return Padding(
                    padding: const EdgeInsets.fromLTRB(22, 6, 22, 6),
                    child: SoftCard(
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            width: 34,
                            height: 34,
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              color: AppColors.gold,
                              shape: BoxShape.circle,
                            ),
                            child: Text('${step.n}',
                                style: const TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w700)),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(step.title, style: AppTheme.serifTitle(18)),
                                const SizedBox(height: 4),
                                Text(step.body,
                                    style: const TextStyle(
                                        color: AppColors.inkSoft,
                                        fontSize: 14,
                                        height: 1.45)),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(22, 10, 22, 40),
                  child: SoftCard(
                    highlight: true,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Kicker('Oración de Fátima'),
                        const SizedBox(height: 8),
                        Text(Rosary.fatima, style: AppTheme.verse),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Rezo guiado con cuentas
// ---------------------------------------------------------------------------
class RosaryPrayScreen extends StatefulWidget {
  final MysterySet set;
  const RosaryPrayScreen({super.key, required this.set});

  @override
  State<RosaryPrayScreen> createState() => _RosaryPrayScreenState();
}

class _RosaryPrayScreenState extends State<RosaryPrayScreen> {
  late final List<_Step> _steps = _buildSteps(widget.set);
  int _i = 0;

  @override
  Widget build(BuildContext context) {
    final step = _steps[_i];
    final progress = (_i + 1) / _steps.length;
    return Scaffold(
      body: SereneBackground(
        child: SafeArea(
          child: Column(
            children: [
              // Barra superior
              Padding(
                padding: const EdgeInsets.fromLTRB(8, 4, 16, 0),
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.of(context).maybePop(),
                    ),
                    Expanded(
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: LinearProgressIndicator(
                          value: progress,
                          minHeight: 6,
                          backgroundColor: AppColors.blueSoft.withOpacity(.4),
                          valueColor:
                              const AlwaysStoppedAnimation(AppColors.gold),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Text('${_i + 1}/${_steps.length}',
                        style: const TextStyle(
                            color: AppColors.inkSoft,
                            fontWeight: FontWeight.w600,
                            fontSize: 13)),
                  ],
                ),
              ),
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Kicker(step.phase),
                      const SizedBox(height: 10),
                      Text(step.title, style: AppTheme.serifTitle(27)),
                      if (step.beadOf != null) ...[
                        const SizedBox(height: 16),
                        _Beads(current: step.beadOf!, total: 10),
                      ],
                      const SizedBox(height: 22),
                      SoftCard(
                        highlight: true,
                        padding: const EdgeInsets.all(20),
                        child: Text(step.body, style: AppTheme.verse),
                      ),
                    ],
                  ),
                ),
              ),
              // Controles
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 4, 24, 20),
                child: Row(
                  children: [
                    if (_i > 0)
                      OutlinedButton(
                        onPressed: () => setState(() => _i--),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.blueDeep,
                          side: BorderSide(color: AppColors.blue.withOpacity(.4)),
                          padding: const EdgeInsets.symmetric(
                              horizontal: 20, vertical: 16),
                        ),
                        child: const Text('Anterior'),
                      ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: FilledButton(
                        onPressed: _i < _steps.length - 1
                            ? () => setState(() => _i++)
                            : () => Navigator.of(context).maybePop(),
                        style: FilledButton.styleFrom(
                          backgroundColor: AppColors.gold,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                        ),
                        child: Text(
                          _i < _steps.length - 1 ? 'Siguiente' : 'Terminar',
                          style: const TextStyle(
                              fontWeight: FontWeight.w600, fontSize: 15),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Beads extends StatelessWidget {
  final int current; // 1..total
  final int total;
  const _Beads({required this.current, required this.total});

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: List.generate(total, (i) {
        final n = i + 1;
        final done = n < current;
        final now = n == current;
        return Container(
          width: 16,
          height: 16,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: done
                ? AppColors.goldBright
                : now
                    ? AppColors.gold
                    : AppColors.blueSoft.withOpacity(.5),
            boxShadow: now
                ? [BoxShadow(color: AppColors.gold.withOpacity(.4), blurRadius: 8)]
                : null,
          ),
        );
      }),
    );
  }
}

class _Step {
  final String phase;
  final String title;
  final String body;
  final int? beadOf; // posición 1..10 dentro de la decena, si aplica
  const _Step(this.phase, this.title, this.body, {this.beadOf});
}

const _padrenuestro =
    'Padre nuestro, que estás en el cielo, santificado sea tu Nombre; venga a nosotros tu reino; hágase tu voluntad en la tierra como en el cielo. Danos hoy nuestro pan de cada día; perdona nuestras ofensas, como también nosotros perdonamos a los que nos ofenden; no nos dejes caer en la tentación, y líbranos del mal. Amén.';
const _avemaria =
    'Dios te salve, María, llena eres de gracia; el Señor es contigo. Bendita tú eres entre todas las mujeres, y bendito es el fruto de tu vientre, Jesús. Santa María, Madre de Dios, ruega por nosotros, pecadores, ahora y en la hora de nuestra muerte. Amén.';
const _gloria =
    'Gloria al Padre, y al Hijo, y al Espíritu Santo. Como era en el principio, ahora y siempre, por los siglos de los siglos. Amén.';
const _salve =
    'Dios te salve, Reina y Madre de misericordia, vida, dulzura y esperanza nuestra; Dios te salve. A Ti llamamos los desterrados hijos de Eva; a Ti suspiramos, gimiendo y llorando, en este valle de lágrimas… ¡Oh clemente, oh piadosa, oh dulce Virgen María!';

List<_Step> _buildSteps(MysterySet set) {
  final steps = <_Step>[
    const _Step('Para comenzar', 'Señal de la Cruz',
        'Por la señal de la Santa Cruz, de nuestros enemigos líbranos, Señor, Dios nuestro. En el nombre del Padre, y del Hijo, y del Espíritu Santo. Amén.'),
    const _Step('Para comenzar', 'Padre Nuestro', _padrenuestro),
    const _Step('Fe, esperanza y caridad', 'Ave María (1ª)', _avemaria),
    const _Step('Fe, esperanza y caridad', 'Ave María (2ª)', _avemaria),
    const _Step('Fe, esperanza y caridad', 'Ave María (3ª)', _avemaria),
    const _Step('Para comenzar', 'Gloria', _gloria),
  ];

  for (var m = 0; m < set.mysteries.length; m++) {
    final mystery = set.mysteries[m];
    final ord = ['1º', '2º', '3º', '4º', '5º'][m];
    steps.add(_Step('$ord misterio · ${set.name}', mystery.title,
        '${mystery.reference}\n\n${mystery.meditation}'));
    steps.add(_Step('${mystery.title} · Decena ${m + 1}', 'Padre Nuestro',
        _padrenuestro));
    for (var b = 1; b <= 10; b++) {
      steps.add(_Step('Decena ${m + 1} de 5', 'Ave María', _avemaria,
          beadOf: b));
    }
    steps.add(_Step('Decena ${m + 1}', 'Gloria', _gloria));
    steps.add(_Step('Decena ${m + 1}', 'Oración de Fátima', Rosary.fatima));
  }

  steps.add(const _Step('Para terminar', 'Salve', _salve));
  steps.add(const _Step('Para terminar', 'Fin del Rosario',
      'Ruega por nosotros, Santa Madre de Dios, para que seamos dignos de alcanzar las promesas de nuestro Señor Jesucristo. En el nombre del Padre, y del Hijo, y del Espíritu Santo. Amén.'));
  return steps;
}
