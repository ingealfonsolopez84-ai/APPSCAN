# Apps iOS de este repositorio

- **Escáner 3D (Scan3D)** — digitaliza objetos reales para impresión 3D con la cámara y el LiDAR (este documento).
- **[NutriLista](NutriLista/README.md)** — convierte la foto del menú de tu nutriólogo en lista de compras, presupuesto y recetario (carpeta `NutriLista/`).

---

# Escáner 3D (Scan3D)

App nativa de iOS que convierte objetos reales en **modelos 3D listos para imprimir**, usando la cámara y el sensor **LiDAR** de los iPhone Pro y Pro Max.

## Funciones

| Modo | Tecnología | Salida | Ideal para |
|------|-----------|--------|------------|
| **Escanear objeto** | Object Capture (RealityKit): captura guiada + fotogrametría en el dispositivo | USDZ con textura | Piezas de 10 cm a 1 m, alta calidad |
| **Escaneo LiDAR** | ARKit Scene Reconstruction (`ARMeshAnchor`) | **STL binario** u **OBJ** | Objetos grandes, muebles, habitaciones |
| **Mis modelos** | Biblioteca local (carpeta Documentos) | Vista previa AR (QuickLook), compartir, eliminar | Gestionar tus escaneos |

Los archivos STL/OBJ se exportan **en milímetros y con el eje Z hacia arriba**, la convención que esperan los laminadores (Cura, PrusaSlicer, Bambu Studio, etc.), así que se pueden laminar directamente.

## Requisitos

- **Xcode 16 o posterior** (el proyecto usa el formato moderno de carpetas sincronizadas).
- **iOS 17.0+**.
- Dispositivo físico con **LiDAR**: iPhone 12 Pro / Pro Max o posterior (cualquier modelo "Pro"), o iPad Pro con LiDAR. El simulador no soporta escaneo.
- Object Capture requiere además chip A14 o superior (todos los iPhone Pro con LiDAR lo cumplen). La app comprueba las capacidades en tiempo de ejecución (`ObjectCaptureSession.isSupported`) y muestra un aviso en dispositivos no compatibles.

## Cómo compilar

1. Abre `Scan3D.xcodeproj` en Xcode.
2. En el target **Scan3D → Signing & Capabilities**, selecciona tu **equipo de desarrollo** (Apple Developer Program).
3. Cambia el **Bundle Identifier** (`com.tuempresa.scan3d`) por uno propio y único.
4. Conecta tu iPhone Pro y ejecuta (⌘R).

## Estructura del proyecto

```
Scan3D/
├── Scan3DApp.swift              # Punto de entrada
├── Views/HomeView.swift         # Pantalla principal con los tres modos
├── Support/DeviceCapability.swift  # Detección de LiDAR / Object Capture
├── ObjectCapture/
│   ├── ObjectCaptureModel.swift    # Ciclo captura -> fotogrametría -> USDZ
│   └── ObjectCaptureFlowView.swift # UI del flujo guiado
├── LiDAR/
│   ├── LiDARScanController.swift   # Sesión ARKit + acumulación de mallas
│   ├── MeshExporter.swift          # Exportador STL binario / OBJ (mm, Z-up)
│   └── LiDARScanView.swift         # UI de escaneo en tiempo real
└── Library/
    ├── ScanStore.swift             # Biblioteca en Documentos/Modelos
    ├── LibraryView.swift           # Lista, compartir, eliminar
    └── QuickLookPreview.swift      # Vista previa 3D/AR del sistema
```

## Flujo de impresión 3D recomendado

1. **Escaneo LiDAR → STL**: el archivo sale listo para el laminador. Repara huecos si hace falta (los escaneos LiDAR son superficies abiertas) con la función "cerrar malla" del laminador, Meshmixer o `Blender → 3D Print Toolbox`.
2. **Escanear objeto → USDZ**: máxima calidad y textura. Para imprimir, convierte USDZ a STL/OBJ en tu Mac (Reality Converter o Blender) o comparte el USDZ directamente para AR.

## Checklist para publicar en App Store

1. **Cuenta**: inscríbete en el [Apple Developer Program](https://developer.apple.com/programs/) (99 US$/año).
2. **Identidad**: bundle ID propio + equipo de firma en Xcode (firma automática recomendada).
3. **App Store Connect**: crea la app con el mismo bundle ID. Nombre sugerido: "Escáner 3D – LiDAR a STL".
4. **Privacidad**:
   - La app ya incluye `NSCameraUsageDescription` (generada desde build settings).
   - En App Store Connect declara: *no se recopilan datos* (todo el procesamiento es local, no hay red ni analítica).
   - Publica una URL de política de privacidad (obligatoria); basta una página que explique que no se recopilan datos.
5. **Disponibilidad por dispositivo**: la app se instala en cualquier iPhone con iOS 17, pero el escaneo solo funciona con LiDAR. La app lo comunica con claridad en pantalla (Apple acepta este enfoque; alternativamente puedes añadir `UIRequiredDeviceCapabilities` para restringir la instalación).
6. **Materiales**: capturas de pantalla de 6,9" y 6,5" (hazlas escaneando un objeto real), icono ya incluido (1024 px), descripción y palabras clave.
7. **Notas para revisión**: indica al equipo de revisión que se necesita un dispositivo con LiDAR y describe los pasos (Escanear objeto → rodear el objeto → Finalizar).
8. **Archivar y subir**: Xcode → Product → Archive → Distribute App → App Store Connect, y envía a revisión.

## Limitaciones conocidas

- La fotogrametría en el dispositivo usa el nivel de detalle `reduced` (límite de iOS); para más detalle, procesa las fotos en una app de macOS con `PhotogrammetrySession`.
- Las mallas LiDAR capturan la superficie visible: para piezas imprimibles estancas suele hacer falta un paso de reparación de malla (ver flujo recomendado).
- El escaneo no funciona en el simulador ni en dispositivos sin LiDAR.
