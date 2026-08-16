import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'services/storage_service.dart';
import 'screens/home_screen.dart';
import 'screens/prayers_screen.dart';
import 'screens/rosary_screen.dart';
import 'screens/mass_screen.dart';
import 'screens/adoration_screen.dart';
import 'theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await StorageService.instance.init();
  SystemChrome.setPreferredOrientations(
      [DeviceOrientation.portraitUp, DeviceOrientation.portraitDown]);
  runApp(const OremusApp());
}

class OremusApp extends StatelessWidget {
  const OremusApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Oremus',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      home: const RootShell(),
    );
  }
}

class RootShell extends StatefulWidget {
  const RootShell({super.key});
  @override
  State<RootShell> createState() => _RootShellState();
}

class _RootShellState extends State<RootShell> {
  int _index = 0;

  void _go(int i) => setState(() => _index = i);

  @override
  Widget build(BuildContext context) {
    final pages = [
      HomeScreen(onNavigate: _go),
      const PrayersScreen(),
      const RosaryScreen(),
      const MassScreen(),
      const AdorationScreen(),
    ];

    return Scaffold(
      body: IndexedStack(index: _index, children: pages),
      bottomNavigationBar: NavigationBarTheme(
        data: NavigationBarThemeData(
          backgroundColor: Colors.white,
          indicatorColor: AppColors.gold.withOpacity(.16),
          labelTextStyle: WidgetStateProperty.resolveWith((states) {
            final selected = states.contains(WidgetState.selected);
            return TextStyle(
              fontSize: 11.5,
              fontWeight: FontWeight.w600,
              color: selected ? AppColors.gold : AppColors.inkSoft,
            );
          }),
          iconTheme: WidgetStateProperty.resolveWith((states) {
            final selected = states.contains(WidgetState.selected);
            return IconThemeData(
              color: selected ? AppColors.gold : AppColors.inkSoft,
            );
          }),
        ),
        child: NavigationBar(
          selectedIndex: _index,
          onDestinationSelected: _go,
          height: 66,
          destinations: const [
            NavigationDestination(
                icon: Icon(Icons.home_outlined),
                selectedIcon: Icon(Icons.home),
                label: 'Inicio'),
            NavigationDestination(
                icon: Icon(Icons.menu_book_outlined),
                selectedIcon: Icon(Icons.menu_book),
                label: 'Oraciones'),
            NavigationDestination(
                icon: Icon(Icons.brightness_7_outlined),
                selectedIcon: Icon(Icons.brightness_7),
                label: 'Rosario'),
            NavigationDestination(
                icon: Icon(Icons.location_on_outlined),
                selectedIcon: Icon(Icons.location_on),
                label: 'Misas'),
            NavigationDestination(
                icon: Icon(Icons.brightness_low_outlined),
                selectedIcon: Icon(Icons.brightness_low),
                label: 'Adorar'),
          ],
        ),
      ),
    );
  }
}
