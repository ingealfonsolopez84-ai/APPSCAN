import ARKit
import RealityKit
import Combine

/// Controla la sesión de ARKit con reconstrucción de escena LiDAR y
/// acumula las mallas (`ARMeshAnchor`) que luego se exportan a STL/OBJ.
@MainActor
final class LiDARScanController: NSObject, ObservableObject, ARSessionDelegate {

    let arView = ARView(frame: .zero)

    @Published private(set) var meshAnchorCount = 0
    @Published private(set) var isRunning = false

    private var meshAnchors: [UUID: ARMeshAnchor] = [:]

    func start() {
        guard ARWorldTrackingConfiguration.supportsSceneReconstruction(.mesh) else { return }

        let configuration = ARWorldTrackingConfiguration()
        configuration.sceneReconstruction = .mesh
        configuration.environmentTexturing = .none
        configuration.planeDetection = [.horizontal, .vertical]

        arView.session.delegate = self
        arView.automaticallyConfigureSession = false
        arView.debugOptions.insert(.showSceneUnderstanding)
        arView.environment.sceneUnderstanding.options.insert(.occlusion)

        meshAnchors.removeAll()
        meshAnchorCount = 0

        arView.session.run(configuration, options: [.resetTracking, .removeExistingAnchors, .resetSceneReconstruction])
        isRunning = true
    }

    func stop() {
        arView.session.pause()
        isRunning = false
    }

    func reset() {
        stop()
        start()
    }

    /// Exporta la malla acumulada al formato indicado y devuelve la URL del
    /// archivo guardado en la biblioteca de la app.
    func export(format: MeshExporter.Format) throws -> URL {
        stop()
        let anchors = Array(meshAnchors.values)
        guard !anchors.isEmpty else {
            throw MeshExporter.ExportError.emptyMesh
        }
        let url = ScanStore.shared.newModelURL(fileExtension: format.fileExtension)
        try MeshExporter.export(anchors: anchors, format: format, to: url)
        ScanStore.shared.refresh()
        return url
    }

    // MARK: - ARSessionDelegate

    nonisolated func session(_ session: ARSession, didAdd anchors: [ARAnchor]) {
        Task { @MainActor in self.merge(anchors) }
    }

    nonisolated func session(_ session: ARSession, didUpdate anchors: [ARAnchor]) {
        Task { @MainActor in self.merge(anchors) }
    }

    nonisolated func session(_ session: ARSession, didRemove anchors: [ARAnchor]) {
        Task { @MainActor in
            for case let meshAnchor as ARMeshAnchor in anchors {
                self.meshAnchors.removeValue(forKey: meshAnchor.identifier)
            }
            self.meshAnchorCount = self.meshAnchors.count
        }
    }

    private func merge(_ anchors: [ARAnchor]) {
        for case let meshAnchor as ARMeshAnchor in anchors {
            meshAnchors[meshAnchor.identifier] = meshAnchor
        }
        meshAnchorCount = meshAnchors.count
    }
}
