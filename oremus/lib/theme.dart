import 'package:flutter/material.dart';

/// Paleta de Oremus: azul mariano suave, oro y destellos.
/// Un aire luminoso y sereno que invita a la paz y la oración.
class AppColors {
  AppColors._();

  // Azules marianos
  static const skyTop = Color(0xFFF3F8FF); // fondo, parte alta
  static const skyBottom = Color(0xFFDCEBFB); // fondo, parte baja
  static const blue = Color(0xFF5B87C4); // azul mariano
  static const blueDeep = Color(0xFF3F6BAD);
  static const blueSoft = Color(0xFFA9C7E8);

  // Oro litúrgico
  static const gold = Color(0xFFC68F2C); // oro legible sobre claro (texto/íconos)
  static const goldBright = Color(0xFFE6B45A); // oro decorativo / destellos
  static const goldSoft = Color(0xFFFBF1DA); // fondo de íconos

  // Neutros con sesgo azul
  static const ink = Color(0xFF26344F); // texto principal
  static const inkSoft = Color(0xFF7488A4); // texto secundario
  static const hairline = Color(0xFFCADCEF);
  static const card = Color(0xFFFFFFFF);
  static const cream = Color(0xFFFBF6EA);

  // Púrpura litúrgico (acentos ocasionales)
  static const purple = Color(0xFF8F79B8);

  static const homeGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [skyTop, skyBottom],
  );
}

class AppTheme {
  AppTheme._();

  static ThemeData get light {
    final base = ThemeData.light(useMaterial3: true);
    const scheme = ColorScheme.light(
      primary: AppColors.gold,
      onPrimary: Colors.white,
      secondary: AppColors.blue,
      onSecondary: Colors.white,
      surface: AppColors.card,
      onSurface: AppColors.ink,
    );

    return base.copyWith(
      colorScheme: scheme,
      scaffoldBackgroundColor: AppColors.skyTop,
      splashColor: AppColors.blueSoft.withOpacity(.25),
      highlightColor: AppColors.blueSoft.withOpacity(.15),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        foregroundColor: AppColors.ink,
        centerTitle: false,
        titleTextStyle: TextStyle(
          fontFamily: _serifFamily,
          fontFamilyFallback: _serifFallback,
          fontSize: 26,
          fontWeight: FontWeight.w500,
          color: AppColors.ink,
          letterSpacing: 0.2,
        ),
      ),
      textTheme: base.textTheme.copyWith(
        displaySmall: _serif(34, FontWeight.w500),
        headlineMedium: _serif(28, FontWeight.w500),
        headlineSmall: _serif(23, FontWeight.w500),
        titleLarge: _serif(20, FontWeight.w500),
        titleMedium: const TextStyle(
          fontSize: 15.5,
          fontWeight: FontWeight.w600,
          color: AppColors.ink,
        ),
        bodyLarge: const TextStyle(fontSize: 16.5, height: 1.55, color: AppColors.ink),
        bodyMedium: const TextStyle(fontSize: 14.5, height: 1.5, color: AppColors.ink),
        labelLarge: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w700,
          letterSpacing: 1.6,
          color: AppColors.gold,
        ),
      ).apply(bodyColor: AppColors.ink, displayColor: AppColors.ink),
      dividerColor: AppColors.hairline,
      iconTheme: const IconThemeData(color: AppColors.gold),
    );
  }

  // Serif con degradación elegante: Georgia (iOS/web) → serif del sistema (Android).
  static const _serifFamily = 'Georgia';
  static const _serifFallback = ['Iowan Old Style', 'Palatino', 'Times New Roman', 'serif'];

  static TextStyle _serif(double size, FontWeight weight) => TextStyle(
        fontFamily: _serifFamily,
        fontFamilyFallback: _serifFallback,
        fontSize: size,
        fontWeight: weight,
        color: AppColors.ink,
        height: 1.15,
      );

  /// Estilo para versículos y textos de oración (cursiva serif).
  static const verse = TextStyle(
    fontFamily: _serifFamily,
    fontFamilyFallback: _serifFallback,
    fontSize: 17,
    height: 1.6,
    fontStyle: FontStyle.italic,
    color: Color(0xFF3A4B6A),
  );

  /// Serif recto para títulos dentro del contenido.
  static TextStyle serifTitle(double size, [FontWeight weight = FontWeight.w500]) =>
      _serif(size, weight);

  /// Etiqueta pequeña en mayúsculas (kicker dorado).
  static const kicker = TextStyle(
    fontSize: 11,
    fontWeight: FontWeight.w700,
    letterSpacing: 2.0,
    color: AppColors.gold,
  );
}
