import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:oremus/data/prayers.dart';
import 'package:oremus/data/rosary.dart';
import 'package:oremus/data/adoration.dart';
import 'package:oremus/models/prayer.dart';
import 'package:oremus/screens/prayer_detail_screen.dart';

void main() {
  group('Biblioteca de oraciones', () {
    test('todas las categorías tienen oraciones', () {
      expect(PrayerLibrary.categories, isNotEmpty);
      for (final c in PrayerLibrary.categories) {
        expect(c.prayers, isNotEmpty, reason: 'Categoría ${c.id} vacía');
      }
    });

    test('cada oración tiene título y al menos un párrafo', () {
      for (final p in PrayerLibrary.all) {
        expect(p.title.trim(), isNotEmpty);
        expect(p.paragraphs, isNotEmpty, reason: '${p.id} sin párrafos');
      }
    });

    test('los ids de oración son únicos', () {
      final ids = PrayerLibrary.all.map((p) => p.id).toList();
      expect(ids.toSet().length, ids.length);
    });

    test('byId encuentra una oración conocida', () {
      expect(PrayerLibrary.byId('ave-maria'), isNotNull);
      expect(PrayerLibrary.byId('no-existe'), isNull);
    });
  });

  group('Rosario', () {
    test('cada esquema de misterios tiene exactamente 5', () {
      for (final s in Rosary.all) {
        expect(s.mysteries.length, 5, reason: '${s.id} no tiene 5 misterios');
      }
    });

    test('el lunes corresponde a los Gozosos y el jueves a los Luminosos', () {
      expect(Rosary.forWeekday(DateTime.monday).id, 'gozosos');
      expect(Rosary.forWeekday(DateTime.thursday).id, 'luminosos');
      expect(Rosary.forWeekday(DateTime.friday).id, 'dolorosos');
      expect(Rosary.forWeekday(DateTime.sunday).id, 'gloriosos');
    });
  });

  group('Adoración', () {
    test('hay momentos de meditación y jaculatorias', () {
      expect(Adoration.moments, isNotEmpty);
      expect(Adoration.aspirations, isNotEmpty);
    });
  });

  testWidgets('La pantalla de detalle muestra el título de la oración',
      (tester) async {
    const prayer = Prayer(
      id: 'test',
      title: 'Oración de prueba',
      paragraphs: ['Primer párrafo.'],
    );
    await tester.pumpWidget(
      const MaterialApp(home: PrayerDetailScreen(prayer: prayer)),
    );
    expect(find.text('Oración de prueba'), findsOneWidget);
    expect(find.text('Primer párrafo.'), findsOneWidget);
  });
}
