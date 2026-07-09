import SwiftUI

/// Lista de modelos guardados con vista previa, compartir y borrar.
struct LibraryView: View {
    @ObservedObject private var store = ScanStore.shared
    @State private var previewModel: ScanStore.ScanModel?

    var body: some View {
        Group {
            if store.models.isEmpty {
                emptyState
            } else {
                list
            }
        }
        .navigationTitle("Mis modelos")
        .onAppear { store.refresh() }
        .sheet(item: $previewModel) { model in
            QuickLookPreview(url: model.url)
                .ignoresSafeArea()
        }
    }

    private var emptyState: some View {
        ContentUnavailableView(
            "Sin modelos todavía",
            systemImage: "cube.transparent",
            description: Text("Cuando completes un escaneo aparecerá aquí, listo para compartir o imprimir.")
        )
    }

    private var list: some View {
        List {
            Section {
                ForEach(store.models) { model in
                    row(for: model)
                }
            } footer: {
                Text("Los archivos STL y OBJ se exportan en milímetros con el eje Z hacia arriba, listos para el laminador.")
            }
        }
    }

    private func row(for model: ScanStore.ScanModel) -> some View {
        HStack(spacing: 12) {
            Image(systemName: iconName(for: model))
                .font(.title2)
                .foregroundStyle(Color.accentColor)
                .frame(width: 36)

            VStack(alignment: .leading, spacing: 2) {
                Text(model.name)
                    .font(.subheadline.weight(.medium))
                    .lineLimit(1)
                Text("\(model.fileExtension.uppercased()) · \(model.formattedSize) · \(model.date.formatted(date: .abbreviated, time: .shortened))")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            ShareLink(item: model.url) {
                Image(systemName: "square.and.arrow.up")
            }
            .buttonStyle(.borderless)
        }
        .contentShape(Rectangle())
        .onTapGesture {
            if model.isPreviewable {
                previewModel = model
            }
        }
        .swipeActions(edge: .trailing) {
            Button(role: .destructive) {
                store.delete(model)
            } label: {
                Label("Eliminar", systemImage: "trash")
            }
        }
    }

    private func iconName(for model: ScanStore.ScanModel) -> String {
        switch model.fileExtension.lowercased() {
        case "usdz": return "arkit"
        case "stl": return "printer"
        default: return "doc"
        }
    }
}

#Preview {
    NavigationStack {
        LibraryView()
    }
}
