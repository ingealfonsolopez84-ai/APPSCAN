# Oremus — Oraciones y rezos católicos

App para **iOS y Android** (un solo código, hecha con **Flutter**) para rezar cada día:
oraciones católicas, el **Santo Rosario paso a paso**, **misas cercanas** según tu
ubicación, y un tiempo guiado de **adoración ante el Santísimo**.

Identidad visual: azul mariano suave, oro litúrgico y destellos — un aire sereno que
invita a la paz y la oración.

---

## Qué incluye

| Sección | Qué hace |
|---|---|
| **Inicio** | Saludo, palabra del día y accesos rápidos. Gestión de *intenciones* personales. |
| **Oraciones** | Más de 40 rezos por categorías: fundamentales, a la Virgen, al Espíritu Santo, mañana y noche, **antes y después de la misa**, y ante el Santísimo. Favoritos y copiar. |
| **Rosario** | Misterios según el día, **guía paso a paso** y un **rezo guiado** que cuenta las cuentas por ti (Ave Marías, decenas, misterios, oraciones de inicio y fin). |
| **Misas** | Con tu permiso de ubicación, abre iglesias católicas cercanas y horarios en Mapas, con indicaciones para llegar. |
| **Adoración** | Temporizador de **15 minutos ante el Santísimo** (o 10/20/30) con meditaciones que avanzan solas y jaculatorias. |

---

## Cómo compilar y ejecutar

> Necesitas el SDK de Flutter: <https://docs.flutter.dev/get-started/install>
> Comprueba tu entorno con `flutter doctor`.

Este repositorio guarda solo el **código de la app** (`lib/`, `assets/`, `test/`,
`pubspec.yaml`). Las carpetas nativas (`android/`, `ios/`, `web/`) se generan en tu
equipo con un comando, para que queden ajustadas a tu versión de Flutter:

```bash
cd oremus
flutter create .            # genera android/, ios/, web/ (respeta lib/ y assets/)
flutter pub get             # descarga dependencias
flutter run                 # ejecuta en el dispositivo/emulador conectado
```

### Formas de probarla

| Cómo | Requisitos | Comando |
|---|---|---|
| 🌐 Navegador (lo más rápido) | Chrome | `flutter run -d chrome` |
| 🤖 Android | Android Studio (emulador) o teléfono con depuración USB | `flutter run` |
| 🍎 iOS | Mac + Xcode (simulador) | `flutter run` |

Mientras corre: `r` recarga en caliente, `R` reinicia, `q` sale.

### Íconos de la app

El ícono está en `assets/icon/icon.png`. Para generarlo en todos los tamaños de
iOS y Android:

```bash
flutter pub run flutter_launcher_icons
```

> El script `assets/icon/mkicon.py` reproduce el ícono (azul mariano + cruz dorada
> con destellos) con Python puro, por si quieres retocar colores.

---

## Permisos (tras `flutter create .`)

La función de **misas cercanas** necesita ubicación. Añade lo siguiente:

### Android — `android/app/src/main/AndroidManifest.xml`

Dentro de `<manifest>`, antes de `<application>`:

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>
<uses-permission android:name="android.permission.INTERNET"/>

<queries>
  <intent>
    <action android:name="android.intent.action.VIEW" />
    <data android:scheme="https" />
  </intent>
  <intent>
    <action android:name="android.intent.action.DIAL" />
    <data android:scheme="tel" />
  </intent>
</queries>
```

### iOS — `ios/Runner/Info.plist`

Dentro del `<dict>` principal:

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Oremus usa tu ubicación para mostrarte iglesias y parroquias católicas cercanas.</string>
<key>LSApplicationQueriesSchemes</key>
<array>
  <string>https</string>
  <string>tel</string>
  <string>comgooglemaps</string>
</array>
```

---

## Seguridad y privacidad

Oremus es **privada por diseño**: casi no tiene superficie de ataque.

- **Sin cuentas ni contraseñas** → no hay credenciales que filtrar.
- **Sin servidor ni backend** → todo el contenido va dentro de la app; nada viaja a
  internet salvo abrir Mapas.
- **Sin analítica ni publicidad** → no se recopilan datos del usuario. Puedes declarar
  con honestidad *"No se recopilan datos"* en App Store y Play Store.
- **Ubicación** (`geolocator`): se pide *solo mientras usas la app*, se emplea en el
  momento y en el dispositivo, y **no se guarda ni se envía**.
- **Enlaces** (`url_launcher`): las URLs de Mapas/teléfono se construyen a partir de
  datos que controla la app, no de texto de terceros → sin riesgo de inyección.
- **Favoritos**: `shared_preferences`, en el almacenamiento privado de la app.
- **Intenciones personales**: **cifradas** con `flutter_secure_storage`
  (Keychain en iOS, Keystore/EncryptedSharedPreferences en Android).
- **Sin secretos ni llaves de API** en el código.

Mantén las dependencias al día con `flutter pub outdated`.

---

## Estructura del proyecto

```
oremus/
├── pubspec.yaml
├── analysis_options.yaml
├── assets/icon/icon.png          # ícono (azul mariano + cruz dorada con destellos)
├── lib/
│   ├── main.dart                 # app + barra de navegación
│   ├── theme.dart                # paleta y estilos (azul mariano, oro, serif)
│   ├── models/prayer.dart
│   ├── data/                     # contenido: prayers, rosary, adoration
│   ├── services/                 # location_service, storage_service (cifrado)
│   ├── widgets/decor.dart        # fondo con destellos, tarjetas, filas
│   └── screens/                  # home, prayers, rosary, mass, adoration, intenciones
├── preview/preview.html          # maqueta visual de las pantallas
└── test/oremus_test.dart         # pruebas unitarias y de widget
```

### Pruebas automáticas

```bash
flutter test
```

Verifican que las oraciones cargan, que sus ids son únicos, que cada esquema de
misterios tiene cinco, que la asignación de misterios por día es correcta y que la
pantalla de detalle muestra la oración.

---

## Nota pastoral

Los textos son oraciones católicas tradicionales de dominio común. Los horarios de
misa los publica cada parroquia; la app te ayuda a encontrar la iglesia y abrir su
ficha para confirmarlos.
