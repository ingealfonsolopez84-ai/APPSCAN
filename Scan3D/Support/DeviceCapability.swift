import ARKit
import RealityKit

/// Comprueba qué modos de escaneo soporta el dispositivo actual.
///
/// - Object Capture (fotogrametría guiada) requiere un iPhone/iPad con LiDAR
///   y chip A14 o superior con iOS 17+ (iPhone 12 Pro en adelante).
/// - La reconstrucción de malla LiDAR requiere cualquier dispositivo con LiDAR.
enum DeviceCapability {
    static var supportsObjectCapture: Bool {
        ObjectCaptureSession.isSupported
    }

    static var supportsLiDARMesh: Bool {
        ARWorldTrackingConfiguration.supportsSceneReconstruction(.mesh)
    }

    static var supportsAnyScanning: Bool {
        supportsObjectCapture || supportsLiDARMesh
    }
}
