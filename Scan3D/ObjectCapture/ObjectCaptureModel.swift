import Foundation
import RealityKit
import SwiftUI

/// Coordina el ciclo completo de Object Capture:
/// captura guiada de imágenes -> reconstrucción fotogramétrica -> modelo USDZ.
@MainActor
final class ObjectCaptureModel: ObservableObject {

    enum Phase: Equatable {
        case notStarted
        case capturing
        case reconstructing(progress: Double)
        case finished(modelURL: URL)
        case failed(message: String)
    }

    @Published private(set) var phase: Phase = .notStarted
    @Published private(set) var session: ObjectCaptureSession?

    private var captureFolder: URL?
    private var stateTask: Task<Void, Never>?

    var imagesFolder: URL? {
        captureFolder?.appendingPathComponent("Images", isDirectory: true)
    }

    private var checkpointFolder: URL? {
        captureFolder?.appendingPathComponent("Checkpoints", isDirectory: true)
    }

    // MARK: - Captura

    func startCapture() {
        do {
            let folder = try Self.makeCaptureFolder()
            captureFolder = folder

            let imagesDir = folder.appendingPathComponent("Images", isDirectory: true)
            let checkpointDir = folder.appendingPathComponent("Checkpoints", isDirectory: true)
            try FileManager.default.createDirectory(at: imagesDir, withIntermediateDirectories: true)
            try FileManager.default.createDirectory(at: checkpointDir, withIntermediateDirectories: true)

            var configuration = ObjectCaptureSession.Configuration()
            configuration.checkpointDirectory = checkpointDir
            configuration.isOverCaptureEnabled = false

            let newSession = ObjectCaptureSession()
            newSession.start(imagesDirectory: imagesDir, configuration: configuration)
            session = newSession
            phase = .capturing
            observeState(of: newSession)
        } catch {
            phase = .failed(message: "No se pudo preparar la captura: \(error.localizedDescription)")
        }
    }

    func finishCapture() {
        session?.finish()
    }

    func cancel() {
        stateTask?.cancel()
        stateTask = nil
        session?.cancel()
        session = nil
        removeCaptureFolder()
        phase = .notStarted
    }

    private func observeState(of session: ObjectCaptureSession) {
        stateTask?.cancel()
        stateTask = Task { [weak self] in
            for await newState in session.stateUpdates {
                guard let self, !Task.isCancelled else { return }
                switch newState {
                case .completed:
                    self.startReconstruction()
                case .failed(let error):
                    self.phase = .failed(message: "La captura falló: \(error.localizedDescription)")
                    self.session = nil
                default:
                    break
                }
            }
        }
    }

    // MARK: - Reconstrucción

    private func startReconstruction() {
        guard let imagesDir = imagesFolder else { return }
        session = nil
        phase = .reconstructing(progress: 0)

        let outputURL = ScanStore.shared.newModelURL(fileExtension: "usdz")
        let checkpointDir = checkpointFolder

        Task {
            do {
                var configuration = PhotogrammetrySession.Configuration()
                if let checkpointDir {
                    configuration.checkpointDirectory = checkpointDir
                }

                let photoSession = try PhotogrammetrySession(
                    input: imagesDir,
                    configuration: configuration
                )
                try photoSession.process(requests: [
                    .modelFile(url: outputURL, detail: .reduced)
                ])

                for try await output in photoSession.outputs {
                    switch output {
                    case .requestProgress(_, let fractionComplete):
                        self.phase = .reconstructing(progress: fractionComplete)
                    case .processingComplete:
                        ScanStore.shared.refresh()
                        self.phase = .finished(modelURL: outputURL)
                        self.removeCaptureFolder()
                    case .requestError(_, let error):
                        self.phase = .failed(message: "Error al generar el modelo: \(error.localizedDescription)")
                    default:
                        break
                    }
                }
            } catch {
                self.phase = .failed(message: "No se pudo reconstruir el modelo: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Archivos temporales

    private static func makeCaptureFolder() throws -> URL {
        let base = FileManager.default.temporaryDirectory
            .appendingPathComponent("Capturas", isDirectory: true)
            .appendingPathComponent(UUID().uuidString, isDirectory: true)
        try FileManager.default.createDirectory(at: base, withIntermediateDirectories: true)
        return base
    }

    private func removeCaptureFolder() {
        if let folder = captureFolder {
            try? FileManager.default.removeItem(at: folder)
        }
        captureFolder = nil
    }
}
