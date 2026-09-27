import 'package:flutter/material.dart';
import '../data/adoration.dart';
import '../theme.dart';
import '../widgets/decor.dart';

/// "15 minutos ante el Santísimo": lectura de oraciones en letra grande,
/// sin temporizador. Incluye un control para agrandar el texto (A− / A+).
class AdorationScreen extends StatefulWidget {
  const AdorationScreen({super.key});

  @override
  State<AdorationScreen> createState() => _AdorationScreenState();
}

class _AdorationScreenState extends State<AdorationScreen> {
  double _scale = 1.15; // arranca en letra grande
  static const double _min = 0.9, _max = 1.8, _step = 0.15;

  void _bigger() => setState(() => _scale = (_scale + _step).clamp(_min, _max));
  void _smaller() => setState(() => _scale = (_scale - _step).clamp(_min, _max));

  TextStyle _verse(double base) => AppTheme.verse.copyWith(
        fontSize: base * _scale,
        height: 1.6,
      );

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SereneBackground(
        child: SafeArea(
          child: CustomScrollView(
            slivers: [
              SliverAppBar(
                pinned: true,
                backgroundColor: Colors.transparent,
                surfaceTintColor: Colors.transparent,
                title: const Text('Ante el Santísimo'),
                actions: [
                  _SizeButton(label: 'A−', onTap: _smaller),
                  _SizeButton(label: 'A+', onTap: _bigger),
                  const SizedBox(width: 8),
                ],
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 40),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '15 minutos ante el Santísimo',
                        style: AppTheme.serifTitle(26 * _scale.clamp(1.0, 1.4)),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Ponte en presencia de Jesús Sacramentado y reza despacio. Usa A− / A+ para ajustar el tamaño de la letra.',
                        style: TextStyle(
                            color: AppColors.inkSoft, fontSize: 13.5 * _scale, height: 1.5),
                      ),
                      const SizedBox(height: 18),

                      // Jaculatoria de entrada
                      SoftCard(
                        highlight: true,
                        padding: const EdgeInsets.all(20),
                        child: Text(Adoration.jaculatoria,
                            textAlign: TextAlign.center, style: _verse(21)),
                      ),
                      const SizedBox(height: 22),

                      // Guía de los 15 minutos (momentos)
                      const Kicker('Guía de los 15 minutos'),
                      const SizedBox(height: 10),
                      ...Adoration.moments.map((m) => Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: SoftCard(
                              padding: const EdgeInsets.all(18),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(m.title,
                                      style: AppTheme.serifTitle(20 * _scale.clamp(1.0, 1.3))),
                                  const SizedBox(height: 8),
                                  Text(m.text, style: _verse(18)),
                                ],
                              ),
                            ),
                          )),

                      const SizedBox(height: 12),
                      const Kicker('Oraciones'),
                      const SizedBox(height: 10),

                      // Oraciones largas (Consagración y Desagravio, San José)
                      ...Adoration.prayers.map((p) => Padding(
                            padding: const EdgeInsets.only(bottom: 14),
                            child: SoftCard(
                              highlight: true,
                              padding: const EdgeInsets.all(20),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(p.title,
                                      style: AppTheme.serifTitle(21 * _scale.clamp(1.0, 1.3))),
                                  const SizedBox(height: 12),
                                  for (var i = 0; i < p.paragraphs.length; i++) ...[
                                    if (i > 0) const SizedBox(height: 16),
                                    Text(p.paragraphs[i], style: _verse(19)),
                                  ],
                                ],
                              ),
                            ),
                          )),

                      const SizedBox(height: 8),
                      // Jaculatorias para el silencio
                      SoftCard(
                        padding: const EdgeInsets.all(18),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Kicker('Jaculatorias para el silencio'),
                            const SizedBox(height: 12),
                            ...Adoration.aspirations.map((a) => Padding(
                                  padding: const EdgeInsets.only(bottom: 10),
                                  child: Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Padding(
                                        padding: EdgeInsets.only(top: 8),
                                        child: Icon(Icons.brightness_1,
                                            size: 7, color: AppColors.goldBright),
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(child: Text(a, style: _verse(18))),
                                    ],
                                  ),
                                )),
                          ],
                        ),
                      ),
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
}

class _SizeButton extends StatelessWidget {
  final String label;
  final VoidCallback onTap;
  const _SizeButton({required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 4),
      child: OutlinedButton(
        onPressed: onTap,
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.gold,
          side: BorderSide(color: AppColors.gold.withOpacity(.5)),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          minimumSize: const Size(0, 36),
        ),
        child: Text(label, style: const TextStyle(fontWeight: FontWeight.w700)),
      ),
    );
  }
}
