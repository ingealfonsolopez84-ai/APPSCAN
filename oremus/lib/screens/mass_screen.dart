import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import '../services/location_service.dart';
import '../theme.dart';
import '../widgets/decor.dart';

class MassScreen extends StatefulWidget {
  const MassScreen({super.key});

  @override
  State<MassScreen> createState() => _MassScreenState();
}

class _MassScreenState extends State<MassScreen> {
  final _location = const LocationService();
  Position? _pos;
  String? _error;
  bool _loading = false;

  Future<void> _locate() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final pos = await _location.currentPosition();
      if (!mounted) return;
      setState(() => _pos = pos);
    } on LocationException catch (e) {
      if (!mounted) return;
      setState(() => _error = e.message);
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = 'No pudimos obtener tu ubicación. Inténtalo de nuevo.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

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
                title: Text('Misas cerca'),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(22, 0, 22, 40),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Encuentra iglesias y parroquias católicas cerca de ti y abre las indicaciones para llegar.',
                        style: const TextStyle(
                            color: AppColors.inkSoft, fontSize: 14, height: 1.5),
                      ),
                      const SizedBox(height: 20),
                      if (_pos == null) _LocateCard(
                        loading: _loading,
                        error: _error,
                        onLocate: _locate,
                      ) else _ResultsCard(pos: _pos!, location: _location),
                      const SizedBox(height: 20),
                      SoftCard(
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(Icons.info_outline,
                                color: AppColors.blue, size: 20),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                'Los horarios exactos de cada misa los publica la propia parroquia. '
                                'Al abrir Mapas verás su ficha con el teléfono y la web para confirmarlos. '
                                'Tu ubicación se usa solo aquí y no se guarda.',
                                style: const TextStyle(
                                    color: AppColors.inkSoft,
                                    fontSize: 13,
                                    height: 1.45),
                              ),
                            ),
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

class _LocateCard extends StatelessWidget {
  final bool loading;
  final String? error;
  final VoidCallback onLocate;
  const _LocateCard({
    required this.loading,
    required this.error,
    required this.onLocate,
  });

  @override
  Widget build(BuildContext context) {
    return SoftCard(
      highlight: true,
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: AppColors.gold.withOpacity(.14),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.location_on_outlined,
                color: AppColors.gold, size: 32),
          ),
          const SizedBox(height: 16),
          Text('Buscar cerca de mí', style: AppTheme.serifTitle(22)),
          const SizedBox(height: 8),
          const Text(
            'Usaremos tu ubicación solo en este momento para mostrarte iglesias cercanas.',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppColors.inkSoft, fontSize: 13.5, height: 1.4),
          ),
          if (error != null) ...[
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFFCEBE9),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(error!,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Color(0xFFA8443B), fontSize: 13)),
            ),
          ],
          const SizedBox(height: 18),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: loading ? null : onLocate,
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.gold,
                padding: const EdgeInsets.symmetric(vertical: 15),
              ),
              icon: loading
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white),
                    )
                  : const Icon(Icons.my_location, size: 20),
              label: Text(loading ? 'Buscando…' : 'Usar mi ubicación',
                  style: const TextStyle(fontWeight: FontWeight.w600)),
            ),
          ),
        ],
      ),
    );
  }
}

class _ResultsCard extends StatelessWidget {
  final Position pos;
  final LocationService location;
  const _ResultsCard({required this.pos, required this.location});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SoftCard(
          highlight: true,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.check_circle, color: AppColors.blue, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text('Ubicación lista',
                        style: AppTheme.serifTitle(20)),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                'Lat ${pos.latitude.toStringAsFixed(4)}, '
                'Lon ${pos.longitude.toStringAsFixed(4)}',
                style: const TextStyle(color: AppColors.inkSoft, fontSize: 12.5),
              ),
              const SizedBox(height: 16),
              _actionButton(
                icon: Icons.church_outlined,
                label: 'Iglesias católicas cercanas',
                onTap: () => location.openNearbyChurches(pos),
              ),
              const SizedBox(height: 10),
              _actionButton(
                icon: Icons.schedule,
                label: 'Buscar horarios de misa',
                onTap: () => location.openMassSearch(pos),
                filled: false,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _actionButton({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    bool filled = true,
  }) {
    return SizedBox(
      width: double.infinity,
      child: filled
          ? FilledButton.icon(
              onPressed: onTap,
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.gold,
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              icon: Icon(icon, size: 20),
              label: Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
            )
          : OutlinedButton.icon(
              onPressed: onTap,
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.blueDeep,
                side: BorderSide(color: AppColors.blue.withOpacity(.4)),
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              icon: Icon(icon, size: 20),
              label: Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
            ),
    );
  }
}
