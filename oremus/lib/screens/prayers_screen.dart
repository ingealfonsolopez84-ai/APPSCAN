import 'package:flutter/material.dart';
import '../data/prayers.dart';
import '../models/prayer.dart';
import '../services/storage_service.dart';
import '../theme.dart';
import '../widgets/decor.dart';
import 'prayer_detail_screen.dart';

class PrayersScreen extends StatelessWidget {
  const PrayersScreen({super.key});

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
                title: Text('Oraciones'),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(22, 0, 22, 8),
                  child: Text(
                    '${PrayerLibrary.all.length} rezos · toca una categoría',
                    style: const TextStyle(color: AppColors.inkSoft, fontSize: 13.5),
                  ),
                ),
              ),
              SliverList.builder(
                itemCount: PrayerLibrary.categories.length,
                itemBuilder: (context, i) {
                  final cat = PrayerLibrary.categories[i];
                  return Padding(
                    padding: const EdgeInsets.fromLTRB(22, 8, 22, 8),
                    child: SoftCard(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                      onTap: () => Navigator.of(context).push(MaterialPageRoute(
                        builder: (_) => CategoryScreen(category: cat),
                      )),
                      child: OremusRow(
                        icon: cat.icon,
                        title: cat.title,
                        subtitle: cat.subtitle,
                      ),
                    ),
                  );
                },
              ),
              const SliverToBoxAdapter(child: SizedBox(height: 28)),
            ],
          ),
        ),
      ),
    );
  }
}

class CategoryScreen extends StatelessWidget {
  final PrayerCategory category;
  const CategoryScreen({super.key, required this.category});

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
                title: Text(category.title),
              ),
              SliverList.builder(
                itemCount: category.prayers.length,
                itemBuilder: (context, i) {
                  final p = category.prayers[i];
                  return Padding(
                    padding: const EdgeInsets.fromLTRB(22, 6, 22, 6),
                    child: SoftCard(
                      onTap: () => Navigator.of(context).push(MaterialPageRoute(
                        builder: (_) => PrayerDetailScreen(prayer: p),
                      )),
                      child: _PrayerTile(prayer: p),
                    ),
                  );
                },
              ),
              const SliverToBoxAdapter(child: SizedBox(height: 28)),
            ],
          ),
        ),
      ),
    );
  }
}

class _PrayerTile extends StatelessWidget {
  final Prayer prayer;
  const _PrayerTile({required this.prayer});

  @override
  Widget build(BuildContext context) {
    final store = StorageService.instance;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(prayer.title, style: AppTheme.serifTitle(19)),
              const SizedBox(height: 4),
              Text(
                prayer.paragraphs.first,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                    color: AppColors.inkSoft, fontSize: 13, height: 1.4),
              ),
            ],
          ),
        ),
        const SizedBox(width: 8),
        AnimatedBuilder(
          animation: store,
          builder: (context, _) => store.isFavorite(prayer.id)
              ? const Icon(Icons.star, color: AppColors.goldBright, size: 20)
              : const Icon(Icons.chevron_right, color: AppColors.gold, size: 22),
        ),
      ],
    );
  }
}
