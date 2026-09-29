# Estudio: portal web para tu set de grabación

Controla tu **cámara Sony** y tu **DJI Osmo Action** desde el navegador, con un **teleprompter** y un **asistente de iluminación** que compara tu toma con una imagen de referencia y te dice qué mover: ajustes de la cámara (los aplica solo) y luces (con distancias en cm).

```
┌──────────── Cámara ────────────┬──── Teleprompter ────┬──── Estado / Iluminación ────┐
│ Vista previa + cuadrícula/guías│  Texto con marcador  │ Modelo, batería, tarjeta,    │
│ GRABAR · Zoom · Enfoque        │  velocidad en ppm    │ tiempo disponible, clips     │
│ ISO · Apertura · Velocidad ·   │  espejo, secciones   │ ── o ──                      │
│ Balance · Compensación         │  (## TÍTULO)         │ Referencia vs. toma en vivo  │
│ Escenas guardadas              │                      │ → plan de cámara y luces     │
└────────────────────────────────┴──────────────────────┴──────────────────────────────┘
```

No tiene dependencias: solo **Node.js 20 o superior**.

## Arranque rápido

```bash
cd Estudio
npm start
# abre http://localhost:8765
```

Sin configuración arranca con una **cámara simulada** (usa la webcam de tu Mac como vista previa) y la **Osmo**, así puedes probar toda la interfaz antes de conectar hardware.

Para usar tus cámaras reales:

```bash
cp config.example.json estudio.config.json   # y deja solo las cámaras que tengas
npm start
```

## Cámaras compatibles

| Driver | Cámara | Conexión | Qué puedes controlar |
|---|---|---|---|
| `sony-usb` | Sony Alpha/ZV/FX recientes (a7 III/IV, a7S III, a6400, a6700, ZV-E10, ZV-1, FX30, FX3…) | USB en modo **"Control remoto PC"** | ISO, apertura, velocidad, balance (K), compensación, grabar/detener, enfoque*, batería, tarjeta, vista previa (~3-8 fps) |
| `sony-wifi` | Sony con la antigua Camera Remote API (a5100, a6000, a6300, a6500, RX100 III-VI, HX, FDR-X3000…) | Wi-Fi de la cámara | ISO, apertura, velocidad, balance, compensación, grabar, zoom motorizado, AF, batería, vista previa fluida |
| `dji-osmo` | DJI Osmo Action 3 / 4 / 5 Pro | USB-C en modo **cámara web** | Vista previa 1080p y grabación desde el portal |
| `mock` | Simulada | — | Todo (para pruebas) |

\* El enfoque manual paso a paso depende del modelo; AF funciona en casi todas.

### Sony por USB (recomendado)

1. Instala gphoto2: `brew install gphoto2` (macOS) o `sudo apt install gphoto2` (Linux / Raspberry Pi).
2. En la cámara: **Red/Configuración → Conexión USB → Control remoto PC** (en algunos modelos "PC Remote").
3. Conecta el cable USB y ejecuta `gphoto2 --auto-detect` para comprobar que la ve.
4. En macOS el portal cierra `ptpcamerad` automáticamente (el sistema "toma" la cámara y bloquea el USB).

**Vista previa fluida**: por USB la vista previa es de pocos fps porque comparte el cable con los ajustes. Para verla a 30/60 fps conecta la salida **HDMI** de la Sony a una **capturadora HDMI→USB** (Elgato Cam Link o una genérica de ~15 USD) y pulsa **"Vista fluida"**: la imagen llega por HDMI y el control sigue por USB.

Si tienes varias cámaras por USB, añade `"port": "usb:020,007"` (lo muestra `gphoto2 --auto-detect`).

### Sony ZV-E10 paso a paso

La ZV-E10 se controla por **USB** (no tiene la API Wi-Fi antigua).

1. **En la cámara**
   - MENU → Configuración (maletín) → **Conexión USB → Control remoto PC**. Si tu firmware tiene *Función control remoto PC*, actívala.
   - Pon el botón de modo en **video** y la exposición en **Exposición manual (M)**. En modo P/A/S la cámara no deja cambiar ISO, apertura y velocidad desde fuera.
   - Deja una tarjeta SD dentro: la grabación va a la tarjeta.
   - **No** uses *Transmisión USB* (modo webcam): en ese modo no se puede controlar.
2. **En la Mac**
   ```bash
   brew install gphoto2
   cd Estudio
   npm run diagnostico
   ```
   Genera `diagnostico-camara.txt` con lo que detectó. Para probar también cambiar ISO y grabar un clip de 3 s:
   `npm run diagnostico -- --escribir --grabar`
3. **Usar el portal**
   ```bash
   cp config.zv-e10.json estudio.config.json
   npm start
   ```
4. **Lo que se sabe de la ZV-E10** (probado con firmware 2.02)
   - El portal mantiene **una sola sesión USB abierta** (`gphoto2 --shell`). Abrir una sesión por comando no funciona bien: la cámara ignora cambios y devuelve valores incompletos.
   - Funcionan: ISO, velocidad, apertura, balance en Kelvin (el portal activa "Temperatura de color" solo), modo de enfoque, grabar, batería, tiempo restante de grabación y vista previa (~10 fps).
   - La **compensación de exposición** solo está disponible con **ISO Auto** (así funciona el modo M de Sony).
   - El **zoom motorizado** del lente de kit no se puede controlar por gphoto2.
   - Al conectar, la cámara tarda unos segundos en reportar la apertura y la velocidad; el portal las vuelve a leer solo.
5. **Consejos**
   - La ZV-E10 gasta batería rápido: usa un adaptador de batería falsa (NP-FW50) o alimentación USB.
   - Vista fluida: sal por el micro-HDMI a una capturadora y desactiva *Visualización info. HDMI* para tener imagen limpia.
   - Cierra el portal antes de correr el diagnóstico (el USB solo admite un programa a la vez).

### Sony por Wi-Fi

Activa en la cámara "Control con smartphone", conecta la computadora a la red Wi-Fi de la cámara y usa el driver `sony-wifi`. Los modelos nuevos (a7 IV, ZV-E10 II, a6700…) **no** tienen esta API por Wi-Fi: con ellos usa USB.

### DJI Osmo Action

DJI **no publica una API** para cambiar ISO o velocidad de las Osmo Action desde una computadora, así que el portal hace lo que sí es fiable:

1. Fija los ajustes de imagen en la propia Osmo (modo Pro).
2. Conecta el USB-C y elige **Cámara web** en la pantalla de la Osmo.
3. En el portal, pestaña *DJI Osmo Action* → "Fuente de video" → elige la Osmo.
4. **GRABAR** graba el video en el navegador y lo descarga (MP4 en Chrome reciente, WebM si no).

Siguiente paso posible: DJI publicó el protocolo Bluetooth para iniciar/detener grabación en la microSD (repositorio `dji-sdk/Osmo-GPS-Controller-Demo`, Osmo Action 4/5 Pro y Osmo 360). Se puede añadir como driver usando un ESP32 o Bluetooth del equipo.

## Modo podcast (varias cámaras a la vez)

Con dos o más cámaras configuradas aparece el botón **🎙 Modo podcast**:

- Muestra **todas las cámaras lado a lado**. Toca un recuadro para elegir qué cámara controlan los ajustes (ISO, enfoque, etc.).
- **GRABAR TODAS** inicia y detiene la grabación en todas las cámaras a la vez:
  - La **Sony** graba en su tarjeta SD, con su calidad completa.
  - La **Osmo** (modo cámara web) se graba desde el navegador y se guarda mientras grabas en `Estudio/grabaciones/`, con el audio del micrófono de la Mac. Los archivos de la misma sesión comparten nombre: `2026-09-29-20-28-46_osmo.mp4`.
- **Claqueta** (activada por defecto): 1.5 s después de iniciar suena un pitido y la pantalla destella. Úsalo en tu editor para alinear los videos por el audio (el pitido queda grabado por el micrófono de la Sony y por el de la Mac).
- Mientras graba, la vista previa de la Osmo no se apaga aunque cambies de pestaña, y el navegador avisa antes de cerrar la página.

Límites: la Osmo en modo cámara web entrega como máximo 1080p a 30 fps. Si quieres 4K en la Osmo, grábala en su propia tarjeta (con su botón) y usa la claqueta para sincronizar.

## Audio por cámara

La caja **Audio** (columna izquierda) muestra la fuente de audio de la cámara seleccionada con un medidor en dBFS: verde hasta −12 dB, amarillo de −12 a −3 dB y rojo a partir de −3 dB (riesgo de saturar). Cada recuadro de vista previa tiene además una barra vertical con su nivel.

- **Sony**: por USB de control no viaja audio. Para ver en el portal lo que capta el micrófono conectado a la Sony, lleva su **HDMI a una capturadora** y elige esa entrada ("Cam Link", "USB Video"…). Si no, escucha con audífonos en la cámara. La Sony siempre graba su propio audio en la tarjeta.
- **Osmo en modo cámara web**: suele aparecer como micrófono propio ("Osmo…"). Elígelo y su grabación llevará **ese audio, independiente del de la Sony**.
- También puedes asignar a cualquier cámara que graba en el navegador otro micrófono conectado a la Mac (micrófono USB o receptor inalámbrico).

La elección se recuerda por cámara. El audio se abre sin cancelación de eco, supresión de ruido ni control automático de ganancia, para no alterar la señal.

## Asistente de iluminación

Es la parte que mide la toma y calcula cómo igualarla a tu imagen de referencia.

1. Pestaña **Iluminación** → **Cargar referencia** (una foto con el look que quieres) o **Usar toma actual** (cuando ya te guste cómo se ve, para repetirlo otro día).
2. Encuádrate igual: sujeto al centro. Se miden 4 zonas: mitad izquierda y derecha de tu cara/cuerpo y dos zonas de fondo.
3. (Opcional) Escribe a qué distancia están tus luces: así te da la nueva distancia en cm.
4. **Medir** → compara:
   - **Exposición del sujeto** (en pasos/EV): se corrige con ISO y, si lo permites, con apertura. Lo que no alcance la cámara se lo pide a la luz principal.
   - **Contraste principal/relleno** (en pasos): te dice cuánto alejar o acercar el relleno.
   - **Separación del fondo**: cuánto subir o bajar la luz de fondo.
   - **Color**: corrige el balance de blancos en Kelvin.
   - **Velocidad**: aplica la regla de 180° (1/60 a 30 fps, 1/50 a 24/25 fps) para evitar parpadeo.
5. **Aplicar a la cámara** aplica los cambios de cámara, o **Igualar automático** repite medir → aplicar → medir hasta que coincida (máximo 6 vueltas), sin que toques la cámara.

Las distancias salen de la **ley del inverso del cuadrado**: la luz que llega es proporcional a 1/d², así que para cambiar *n* pasos la distancia se multiplica por 2^(−n/2). Por ejemplo, 1 paso menos de relleno = alejarlo ×1.41 (de 100 cm a 141 cm).

> Las luces no se mueven solas: si algún día usas luces inteligentes (Elgato Key Light, Aputure con app Sidus, Godox con Bluetooth/DMX), se puede añadir un driver para que el modo automático también ajuste su potencia y temperatura.

## Teleprompter

- Velocidad en **palabras por minuto (ppm)**: el desplazamiento se calcula con el número de palabras del guion, así que 150 ppm son 150 ppm sin importar el tamaño de letra.
- `## SECCIÓN` en una línea crea una etiqueta (como "EL MAPA").
- Botón **⇋** para modo espejo (teleprompter de cristal).
- Los guiones y escenas se guardan en `Estudio/data/` en el servidor, así los ves desde cualquier pantalla.

## Atajos (teclado o control remoto)

| Tecla | Acción |
|---|---|
| `Espacio` | Iniciar / pausar teleprompter |
| `R` | Grabar / detener |
| `+` / `−` | Velocidad del teleprompter |
| `Inicio` | Volver al principio |
| Flechas + `Enter` | Moverse entre botones y pulsarlos (pensado para usarlo en la TV) |

## Llevarlo a la TV sin depender de la Mac

Roku no tiene navegador web y sus apps se programan en BrightScript, así que no puede ejecutar este portal tal cual. Opciones que sí funcionan con el control remoto de la TV:

1. **Raspberry Pi 5 o mini PC conectado por HDMI a la TV** (recomendado): corre el servidor (`npm start`), la Sony por USB y Chromium en modo kiosco (`chromium --kiosk http://localhost:8765`). Con **HDMI-CEC** (`cec-client`/`ceccontrol`) las flechas y OK del control de la TV llegan como teclas, y el portal ya se navega con flechas.
2. **Servidor en la Pi / mini PC + TV con navegador** (Android TV / Google TV / Fire TV): abre `http://IP-del-servidor:8765` en el navegador de la TV.
3. **App de Roku**: sería un proyecto aparte en BrightScript que llame a la misma API (`/api/camera/...`); la API ya está lista para eso.

## API (para automatizar o crear otros controles)

| Método | Ruta | Cuerpo |
|---|---|---|
| GET | `/api/cameras` | — |
| GET | `/api/events` | Server-Sent Events con el estado de todas las cámaras cada segundo |
| GET | `/api/camera/:id/live` | Vista previa MJPEG |
| GET | `/api/camera/:id/snapshot` | Un JPEG |
| POST | `/api/camera/:id/set` | `{ "key": "iso", "value": "1600" }` o `{ "key": "iso", "step": 1 }` |
| POST | `/api/camera/:id/setMany` | `{ "values": { "iso": "1600", "wb": "5200" } }` |
| POST | `/api/camera/:id/record` | `{ "action": "start" \| "stop" \| "toggle" }` |
| POST | `/api/camera/:id/zoom` | `{ "direction": "in" \| "out", "action": "start" \| "stop" }` |
| POST | `/api/camera/:id/focus` | `{ "action": "af" \| "near" \| "near2" \| "far" \| "far2" }` |

`key` puede ser `iso`, `aperture`, `shutter`, `wb` (Kelvin) o `ev`.

## Estructura

```
Estudio/
├── server/
│   ├── index.js            # servidor HTTP, API, SSE y vista previa MJPEG
│   ├── settings.js         # modelo común de ajustes (pasos, valores cercanos)
│   └── drivers/
│       ├── gphoto2.js      # Sony por USB (y otras marcas compatibles con gphoto2)
│       ├── sony-wifi.js    # Sony Camera Remote API + parser del liveview
│       ├── dji-osmo.js     # Osmo Action en modo webcam
│       └── mock.js         # cámara simulada
├── public/
│   ├── index.html · styles.css · app.js
│   └── analysis.js         # medición de luz y cálculo del plan (funciones puras)
├── test/core.test.js       # npm test
└── config.example.json
```

## Seguridad

El servidor escucha en toda la red local (`0.0.0.0`) para que la TV u otro equipo puedan abrirlo, y **no tiene contraseña**: úsalo solo en tu red de casa. Para limitarlo al propio equipo: `HOST=127.0.0.1 npm start`.
