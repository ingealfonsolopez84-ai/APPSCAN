import 'package:flutter/material.dart';

/// Una oración con su título, texto y una nota opcional de contexto
/// (cuándo o cómo rezarla).
class Prayer {
  final String id;
  final String title;
  final String? latinTitle;

  /// Cuerpo de la oración. Cada elemento es un párrafo.
  final List<String> paragraphs;

  /// Breve nota de contexto (opcional).
  final String? note;

  const Prayer({
    required this.id,
    required this.title,
    this.latinTitle,
    required this.paragraphs,
    this.note,
  });

  /// Texto plano completo, útil para compartir o copiar.
  String get plainText => ([title, ...paragraphs]).join('\n\n');
}

/// Categoría de oraciones para agrupar en la biblioteca.
class PrayerCategory {
  final String id;
  final String title;
  final String subtitle;
  final IconData icon;
  final List<Prayer> prayers;

  const PrayerCategory({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.prayers,
  });
}
