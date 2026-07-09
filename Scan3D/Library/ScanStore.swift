import Foundation
import Combine

/// Gestiona la carpeta de modelos guardados en Documentos y expone la lista
/// de escaneos a la interfaz.
@MainActor
final class ScanStore: ObservableObject {

    static let shared = ScanStore()

    struct ScanModel: Identifiable, Hashable {
        let url: URL
        let name: String
        let fileExtension: String
        let date: Date
        let sizeInBytes: Int

        var id: URL { url }

        var formattedSize: String {
            ByteCountFormatter.string(fromByteCount: Int64(sizeInBytes), countStyle: .file)
        }

        var isPreviewable: Bool {
            // QuickLook muestra USDZ y OBJ; STL solo se comparte.
            ["usdz", "obj", "reality"].contains(fileExtension.lowercased())
        }
    }

    @Published private(set) var models: [ScanModel] = []

    let modelsDirectory: URL

    private static let allowedExtensions: Set<String> = ["usdz", "stl", "obj"]

    private init() {
        let documents = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        modelsDirectory = documents.appendingPathComponent("Modelos", isDirectory: true)
        try? FileManager.default.createDirectory(at: modelsDirectory, withIntermediateDirectories: true)
        refresh()
    }

    /// Devuelve una URL nueva y única dentro de la biblioteca para guardar un modelo.
    func newModelURL(fileExtension: String) -> URL {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd_HH-mm-ss"
        let name = "Escaneo_\(formatter.string(from: Date()))"

        var url = modelsDirectory.appendingPathComponent(name).appendingPathExtension(fileExtension)
        var attempt = 1
        while FileManager.default.fileExists(atPath: url.path) {
            url = modelsDirectory
                .appendingPathComponent("\(name)_\(attempt)")
                .appendingPathExtension(fileExtension)
            attempt += 1
        }
        return url
    }

    func refresh() {
        let fileManager = FileManager.default
        let contents = (try? fileManager.contentsOfDirectory(
            at: modelsDirectory,
            includingPropertiesForKeys: [.contentModificationDateKey, .fileSizeKey],
            options: [.skipsHiddenFiles]
        )) ?? []

        models = contents
            .filter { Self.allowedExtensions.contains($0.pathExtension.lowercased()) }
            .compactMap { url in
                let values = try? url.resourceValues(forKeys: [.contentModificationDateKey, .fileSizeKey])
                return ScanModel(
                    url: url,
                    name: url.deletingPathExtension().lastPathComponent,
                    fileExtension: url.pathExtension,
                    date: values?.contentModificationDate ?? .distantPast,
                    sizeInBytes: values?.fileSize ?? 0
                )
            }
            .sorted { $0.date > $1.date }
    }

    func delete(_ model: ScanModel) {
        try? FileManager.default.removeItem(at: model.url)
        refresh()
    }
}
