import 'package:geolocator/geolocator.dart';
import 'package:url_launcher/url_launcher.dart';

/// Servicio de ubicación para la función "Misas cerca de ti".
///
/// Privacidad: la ubicación se usa solo en el momento y en el dispositivo
/// (para calcular distancias y abrir Mapas). No se guarda ni se envía a
/// ningún servidor. Se pide permiso "solo mientras usas la app".
class LocationService {
  const LocationService();

  /// Obtiene la posición actual, gestionando permisos y servicio apagado.
  /// Lanza [LocationException] con un mensaje claro si no es posible.
  Future<Position> currentPosition() async {
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      throw const LocationException(
        'La ubicación está desactivada. Actívala para ver misas cercanas.',
      );
    }

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied) {
      throw const LocationException(
        'Necesitamos tu permiso de ubicación para buscar iglesias cercanas.',
      );
    }
    if (permission == LocationPermission.deniedForever) {
      throw const LocationException(
        'El permiso de ubicación está bloqueado. Actívalo en los Ajustes del teléfono.',
      );
    }

    return Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.medium,
      ),
    );
  }

  /// Abre en la app de mapas una búsqueda de iglesias/parroquias católicas
  /// cerca de la posición dada.
  Future<bool> openNearbyChurches(Position pos) {
    final uri = Uri.parse(
      'https://www.google.com/maps/search/iglesia+cat%C3%B3lica/'
      '@${pos.latitude},${pos.longitude},15z',
    );
    return _launch(uri);
  }

  /// Abre una búsqueda de misas cercanas (horarios los publica cada parroquia).
  Future<bool> openMassSearch(Position pos) {
    final uri = Uri.parse(
      'https://www.google.com/maps/search/horario+de+misa+iglesia/'
      '@${pos.latitude},${pos.longitude},14z',
    );
    return _launch(uri);
  }

  /// Abre indicaciones para llegar a un destino con nombre.
  Future<bool> openDirections(String query) {
    final uri = Uri.parse(
      'https://www.google.com/maps/dir/?api=1&destination=${Uri.encodeComponent(query)}',
    );
    return _launch(uri);
  }

  Future<bool> _launch(Uri uri) =>
      launchUrl(uri, mode: LaunchMode.externalApplication);
}

class LocationException implements Exception {
  final String message;
  const LocationException(this.message);
  @override
  String toString() => message;
}
