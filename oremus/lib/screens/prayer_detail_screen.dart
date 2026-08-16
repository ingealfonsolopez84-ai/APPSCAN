import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../models/prayer.dart';
import '../services/storage_service.dart';
import '../theme.dart';
import '../widgets/decor.dart';

class PrayerDetailScreen extends StatelessWidget {
  final Prayer prayer;
  const PrayerDetailScreen({super.key, required this.prayer});

  @override
  Widget build(BuildContext context) {
    final store = StorageService.instance;
    return Scaffold(
      body: SereneBackground(
        child: SafeArea(
          child: CustomScrollView(
            slivers: [
              SliverAppBar(
                pinned: true,
                backgroundColor: Colors.transparent,
                surfaceTintColor: Colors.transparent,
                actions: [
                  AnimatedBuilder(
                    animation: store,
                    builder: (context, _) {
                      final fav = store.isFavorite(prayer.id);
                      return IconButton(
                        tooltip: fav ? 'Quitar de favoritos' : 'Guardar en favoritos',
                        icon: Icon(fav ? Icons.star : Icons.star_border),
                        onPressed: () => store.toggleFavorite(prayer.id),
                      );
                    },
                  ),
                  IconButton(
                    tooltip: 'Copiar',
                    icon: const Icon(Icons.copy_all_outlined),
                    onPressed: () {
                      Clipboard.setData(ClipboardData(text: prayer.plainText));
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Oración copiada')),
                      );
                    },
                  ),
                ],
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(22, 6, 22, 40),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (prayer.latinTitle != null) ...[
                        Kicker(prayer.latinTitle!),
                        const SizedBox(height: 8),
                      ],
                      Text(prayer.title,
                          style: AppTheme.serifTitle(32)),
                      if (prayer.note != null) ...[
                        const SizedBox(height: 12),
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(Icons.info_outline,
                                size: 16, color: AppColors.blue),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(prayer.note!,
                                  style: const TextStyle(
                                      fontSize: 13.5,
                                      color: AppColors.inkSoft,
                                      height: 1.4)),
                            ),
                          ],
                        ),
                      ],
                      const SizedBox(height: 22),
                      SoftCard(
                        highlight: true,
                        padding: const EdgeInsets.fromLTRB(20, 22, 20, 22),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            for (var i = 0; i < prayer.paragraphs.length; i++) ...[
                              if (i > 0) const SizedBox(height: 18),
                              Text(prayer.paragraphs[i], style: AppTheme.verse),
                            ],
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
