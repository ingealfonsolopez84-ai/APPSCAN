import 'package:flutter/material.dart';
import '../services/storage_service.dart';
import '../theme.dart';

/// Hoja modal para gestionar las intenciones personales (guardadas cifradas).
Future<void> showIntentionsSheet(BuildContext context) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.white,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (_) => const _IntentionsSheet(),
  );
}

class _IntentionsSheet extends StatefulWidget {
  const _IntentionsSheet();
  @override
  State<_IntentionsSheet> createState() => _IntentionsSheetState();
}

class _IntentionsSheetState extends State<_IntentionsSheet> {
  final _controller = TextEditingController();
  final _store = StorageService.instance;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _add() async {
    await _store.addIntention(_controller.text);
    _controller.clear();
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.of(context).viewInsets.bottom;
    return Padding(
      padding: EdgeInsets.fromLTRB(22, 18, 22, 18 + bottom),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 44,
              height: 5,
              decoration: BoxDecoration(
                color: AppColors.blueSoft,
                borderRadius: BorderRadius.circular(4),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text('Mis intenciones', style: AppTheme.serifTitle(24)),
          const SizedBox(height: 4),
          const Text(
            'Aquello por lo que quieres rezar. Se guarda cifrado, solo en tu teléfono.',
            style: TextStyle(color: AppColors.inkSoft, fontSize: 13, height: 1.4),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _controller,
                  textCapitalization: TextCapitalization.sentences,
                  onSubmitted: (_) => _add(),
                  decoration: InputDecoration(
                    hintText: 'Por la salud de…',
                    filled: true,
                    fillColor: AppColors.skyTop,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide(color: AppColors.blue.withOpacity(.3)),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide(color: AppColors.blue.withOpacity(.2)),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              FilledButton(
                onPressed: _add,
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.gold,
                  padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 18),
                ),
                child: const Icon(Icons.add),
              ),
            ],
          ),
          const SizedBox(height: 12),
          AnimatedBuilder(
            animation: _store,
            builder: (context, _) {
              if (_store.intentions.isEmpty) {
                return const Padding(
                  padding: EdgeInsets.symmetric(vertical: 24),
                  child: Center(
                    child: Text('Aún no has añadido intenciones.',
                        style: TextStyle(color: AppColors.inkSoft)),
                  ),
                );
              }
              return ConstrainedBox(
                constraints: const BoxConstraints(maxHeight: 300),
                child: ListView.separated(
                  shrinkWrap: true,
                  itemCount: _store.intentions.length,
                  separatorBuilder: (_, __) => const Divider(height: 1),
                  itemBuilder: (context, i) => ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(Icons.brightness_1,
                        size: 8, color: AppColors.goldBright),
                    title: Text(_store.intentions[i]),
                    trailing: IconButton(
                      icon: const Icon(Icons.close, size: 18, color: AppColors.inkSoft),
                      onPressed: () => _store.removeIntention(i),
                    ),
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}
