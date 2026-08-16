import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../theme.dart';

/// Fondo sereno de la app: degradado azul mariano con destellos dorados sutiles.
class SereneBackground extends StatelessWidget {
  final Widget child;
  const SereneBackground({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(gradient: AppColors.homeGradient),
      child: CustomPaint(
        painter: _SparklePainter(),
        child: child,
      ),
    );
  }
}

class _SparklePainter extends CustomPainter {
  // Posiciones relativas y tamaño de los destellos.
  static const _sparks = [
    [0.16, 0.10, 12.0],
    [0.82, 0.08, 9.0],
    [0.68, 0.22, 7.0],
    [0.28, 0.30, 6.0],
    [0.90, 0.44, 8.0],
    [0.10, 0.52, 7.0],
  ];

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = AppColors.goldBright.withOpacity(.28);
    for (final s in _sparks) {
      _drawStar(canvas, Offset(s[0] * size.width, s[1] * size.height), s[2], paint);
    }
  }

  void _drawStar(Canvas canvas, Offset c, double r, Paint paint) {
    final path = Path();
    const points = 4;
    for (var i = 0; i < points * 2; i++) {
      final radius = i.isEven ? r : r * 0.32;
      final angle = i * math.pi / points - math.pi / 2;
      final p = Offset(c.dx + radius * math.cos(angle), c.dy + radius * math.sin(angle));
      i == 0 ? path.moveTo(p.dx, p.dy) : path.lineTo(p.dx, p.dy);
    }
    path.close();
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant _SparklePainter oldDelegate) => false;
}

/// Etiqueta dorada en mayúsculas (kicker).
class Kicker extends StatelessWidget {
  final String text;
  const Kicker(this.text, {super.key});
  @override
  Widget build(BuildContext context) =>
      Text(text.toUpperCase(), style: AppTheme.kicker);
}

/// Tarjeta base con borde azul suave y sombra tenue.
class SoftCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;
  final bool highlight;
  const SoftCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.onTap,
    this.highlight = false,
  });

  @override
  Widget build(BuildContext context) {
    final card = AnimatedContainer(
      duration: const Duration(milliseconds: 150),
      padding: padding,
      decoration: BoxDecoration(
        color: highlight ? null : AppColors.card,
        gradient: highlight
            ? const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Colors.white, Color(0xFFF4F8FF)],
              )
            : null,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: highlight
              ? AppColors.gold.withOpacity(.32)
              : AppColors.blue.withOpacity(.18),
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.blueDeep.withOpacity(.10),
            blurRadius: 16,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: child,
    );

    if (onTap == null) return card;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onTap,
        child: card,
      ),
    );
  }
}

/// Fila de lista con ícono dorado, título, subtítulo y chevron.
class OremusRow extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;
  final VoidCallback? onTap;
  final Widget? trailing;
  const OremusRow({
    super.key,
    required this.icon,
    required this.title,
    this.subtitle,
    this.onTap,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(14),
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 10),
        child: Row(
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [Color(0xFFFBF1DA), Color(0xFFF6E6C4)],
                ),
                borderRadius: BorderRadius.circular(13),
                border: Border.all(color: AppColors.gold.withOpacity(.30)),
              ),
              child: Icon(icon, size: 21, color: AppColors.gold),
            ),
            const SizedBox(width: 13),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title,
                      style: const TextStyle(
                          fontSize: 15.5,
                          fontWeight: FontWeight.w600,
                          color: AppColors.ink)),
                  if (subtitle != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 2),
                      child: Text(subtitle!,
                          style: const TextStyle(
                              fontSize: 12.5, color: AppColors.inkSoft)),
                    ),
                ],
              ),
            ),
            trailing ??
                const Icon(Icons.chevron_right, color: AppColors.gold, size: 22),
          ],
        ),
      ),
    );
  }
}
