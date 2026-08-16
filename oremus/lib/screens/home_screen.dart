import 'package:flutter/material.dart';
import '../data/rosary.dart';
import '../services/storage_service.dart';
import '../theme.dart';
import '../widgets/decor.dart';
import 'intentions_sheet.dart';

class HomeScreen extends StatelessWidget {
  /// Cambia de pestaña (0 inicio, 1 oraciones, 2 rosario, 3 misas, 4 adoración).
  final ValueChanged<int> onNavigate;
  const HomeScreen({super.key, required this.onNavigate});

  static const _verses = [
    ('«Venid a mí todos los que estáis cansados y agobiados, y yo os aliviaré.»', 'Mateo 11, 28'),
    ('«El Señor es mi pastor, nada me falta.»', 'Salmo 23, 1'),
    ('«Todo lo puedo en Aquel que me conforta.»', 'Filipenses 4, 13'),
    ('«Dichosa tú que has creído, porque lo que te ha dicho el Señor se cumplirá.»', 'Lucas 1, 45'),
    ('«Estad siempre alegres. Orad sin cesar. Dad gracias en toda ocasión.»', '1 Tesalonicenses 5, 16-18'),
    ('«No temas, porque yo estoy contigo.»', 'Isaías 41, 10'),
    ('«Buscad primero el Reino de Dios y su justicia.»', 'Mateo 6, 33'),
  ];

  String _greeting() {
    final h = DateTime.now().hour;
    if (h < 12) return 'Buenos días';
    if (h < 20) return 'Buenas tardes';
    return 'Buenas noches';
  }

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final verse = _verses[now.difference(DateTime(now.year)).inDays % _verses.length];
    final today = Rosary.forWeekday(now.weekday);
    final store = StorageService.instance;

    return Scaffold(
      body: SereneBackground(
        child: SafeArea(
          child: CustomScrollView(
            slivers: [
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(24, 24, 24, 40),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const _CrestMark(),
                          const Spacer(),
                          IconButton(
                            tooltip: 'Mis intenciones',
                            onPressed: () => showIntentionsSheet(context),
                            icon: const Icon(Icons.edit_note, color: AppColors.gold),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      Text(_greeting(), style: AppTheme.serifTitle(34)),
                      const SizedBox(height: 4),
                      Text(_prettyDate(now),
                          style: const TextStyle(
                              color: AppColors.inkSoft, fontSize: 14)),
                      const SizedBox(height: 22),

                      // Oración del día
                      SoftCard(
                        highlight: true,
                        padding: const EdgeInsets.all(22),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Kicker('Palabra del día'),
                            const SizedBox(height: 12),
                            Text(verse.$1, style: AppTheme.verse.copyWith(fontSize: 19)),
                            const SizedBox(height: 12),
                            Text(verse.$2,
                                style: const TextStyle(
                                    color: AppColors.inkSoft,
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600)),
                          ],
                        ),
                      ),
                      const SizedBox(height: 22),

                      const Kicker('Para hoy'),
                      const SizedBox(height: 10),
                      SoftCard(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: Column(
                          children: [
                            OremusRow(
                              icon: Icons.brightness_7_outlined,
                              title: 'Rosario de hoy',
                              subtitle: '${today.name} · ${today.days}',
                              onTap: () => onNavigate(2),
                            ),
                            const Divider(height: 1),
                            OremusRow(
                              icon: Icons.location_on_outlined,
                              title: 'Misas cerca de ti',
                              subtitle: 'Según tu ubicación',
                              onTap: () => onNavigate(3),
                            ),
                            const Divider(height: 1),
                            OremusRow(
                              icon: Icons.brightness_low_outlined,
                              title: '15 min ante el Santísimo',
                              subtitle: 'Adoración guiada',
                              onTap: () => onNavigate(4),
                            ),
                            const Divider(height: 1),
                            OremusRow(
                              icon: Icons.menu_book_outlined,
                              title: 'Oraciones',
                              subtitle: 'Antes y después de misa, y muchas más',
                              onTap: () => onNavigate(1),
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 22),
                      AnimatedBuilder(
                        animation: store,
                        builder: (context, _) {
                          if (store.intentions.isEmpty) return const SizedBox.shrink();
                          return SoftCard(
                            onTap: () => showIntentionsSheet(context),
                            child: Row(
                              children: [
                                const Icon(Icons.favorite_border,
                                    color: AppColors.gold),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text('Mis intenciones',
                                          style: AppTheme.serifTitle(18)),
                                      Text(
                                        '${store.intentions.length} guardada(s) · las llevas en la oración',
                                        style: const TextStyle(
                                            color: AppColors.inkSoft, fontSize: 12.5),
                                      ),
                                    ],
                                  ),
                                ),
                                const Icon(Icons.chevron_right, color: AppColors.gold),
                              ],
                            ),
                          );
                        },
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

  static const _months = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  static const _weekdays = [
    'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'
  ];

  String _prettyDate(DateTime d) =>
      '${_weekdays[d.weekday - 1]} · ${d.day} de ${_months[d.month - 1]}';
}

class _CrestMark extends StatelessWidget {
  const _CrestMark();
  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            gradient: const RadialGradient(
              colors: [Colors.white, AppColors.skyBottom],
            ),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.gold.withOpacity(.4)),
          ),
          child: const Icon(Icons.add, color: AppColors.gold, size: 24),
        ),
        const SizedBox(width: 10),
        Text('Oremus', style: AppTheme.serifTitle(22)),
      ],
    );
  }
}
