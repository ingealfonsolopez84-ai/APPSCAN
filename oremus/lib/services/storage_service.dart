import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Almacenamiento local de Oremus.
///
/// - **Favoritos** (ids de oraciones): datos no sensibles → `shared_preferences`.
/// - **Intenciones personales**: pueden ser muy privadas → almacenamiento
///   **cifrado** con `flutter_secure_storage` (Keychain en iOS, Keystore en
///   Android). Nada de esto sale del dispositivo.
class StorageService extends ChangeNotifier {
  StorageService._();
  static final StorageService instance = StorageService._();

  static const _favKey = 'oremus.favorites';
  static const _intentionsKey = 'oremus.intentions';

  final _secure = const FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
  );

  SharedPreferences? _prefs;
  final Set<String> _favorites = {};
  List<String> _intentions = [];

  Set<String> get favorites => Set.unmodifiable(_favorites);
  List<String> get intentions => List.unmodifiable(_intentions);

  Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
    _favorites
      ..clear()
      ..addAll(_prefs?.getStringList(_favKey) ?? const []);
    _intentions = await _readIntentions();
    notifyListeners();
  }

  bool isFavorite(String prayerId) => _favorites.contains(prayerId);

  Future<void> toggleFavorite(String prayerId) async {
    if (!_favorites.add(prayerId)) _favorites.remove(prayerId);
    await _prefs?.setStringList(_favKey, _favorites.toList());
    notifyListeners();
  }

  Future<void> addIntention(String text) async {
    final t = text.trim();
    if (t.isEmpty) return;
    _intentions = [t, ..._intentions];
    await _persistIntentions();
    notifyListeners();
  }

  Future<void> removeIntention(int index) async {
    if (index < 0 || index >= _intentions.length) return;
    _intentions = List.of(_intentions)..removeAt(index);
    await _persistIntentions();
    notifyListeners();
  }

  Future<List<String>> _readIntentions() async {
    final raw = await _secure.read(key: _intentionsKey);
    if (raw == null || raw.isEmpty) return [];
    try {
      final decoded = jsonDecode(raw);
      if (decoded is List) {
        return decoded.map((e) => e.toString()).toList();
      }
    } catch (_) {
      // Dato ilegible: se ignora en lugar de fallar.
    }
    return [];
  }

  Future<void> _persistIntentions() =>
      _secure.write(key: _intentionsKey, value: jsonEncode(_intentions));
}
