import SwiftUI
import ARKit
import RealityKit

/// Escaneo rápido con LiDAR: muestra la malla en tiempo real sobre la cámara
/// y exporta el resultado a STL u OBJ.
struct LiDARScanView: View {
    @StateObject private var controller = LiDARScanController()
    @Environment(\.dismiss) private var dismiss

    @State private var showFormatDialog = false
    @State private var exportedFile: ExportedFile?
    @State private var exportError: String?

    private struct ExportedFile: Identifiable {
        let url: URL
        var id: String { url.absoluteString }
    }

    var body: some View {
        ZStack {
            ARViewContainer(arView: controller.arView)
                .ignoresSafeArea()

            VStack {
                statusBadge
                    .padding(.top, 8)

                Spacer()

                if exportedFile == nil {
                    scanControls
                }
            }
        }
        .navigationTitle("Escaneo LiDAR")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(.hidden, for: .navigationBar)
        .onAppear { controller.start() }
        .onDisappear { controller.stop() }
        .confirmationDialog("Formato de exportación", isPresented: $showFormatDialog, titleVisibility: .visible) {
            ForEach(MeshExporter.Format.allCases) { format in
                Button(format.displayName) { export(format) }
            }
            Button("Cancelar", role: .cancel) {}
        } message: {
            Text("El modelo se exporta en milímetros con el eje Z hacia arriba, listo para el laminador.")
        }
        .alert("No se pudo exportar", isPresented: .init(
            get: { exportError != nil },
            set: { if !$0 { exportError = nil } }
        )) {
            Button("Aceptar", role: .cancel) { controller.start() }
        } message: {
            Text(exportError ?? "")
        }
        .sheet(item: $exportedFile) { file in
            ExportResultSheet(url: file.url) {
                exportedFile = nil
                dismiss()
            } onNewScan: {
                exportedFile = nil
                controller.start()
            }
        }
    }

    private var statusBadge: some View {
        Label("Superficies capturadas: \(controller.meshAnchorCount)", systemImage: "square.3.layers.3d")
            .font(.footnote.weight(.medium))
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(.ultraThinMaterial, in: Capsule())
    }

    private var scanControls: some View {
        VStack(spacing: 12) {
            Text("Recorre despacio el objeto o el espacio hasta cubrir todas las superficies.")
                .font(.footnote)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))
                .padding(.horizontal)

            HStack(spacing: 12) {
                Button {
                    controller.reset()
                } label: {
                    Label("Reiniciar", systemImage: "arrow.counterclockwise")
                }
                .buttonStyle(.bordered)
                .controlSize(.large)

                Button {
                    showFormatDialog = true
                } label: {
                    Label("Finalizar y exportar", systemImage: "square.and.arrow.down")
                        .font(.headline)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .disabled(controller.meshAnchorCount == 0)
            }
        }
        .padding(.bottom, 24)
    }

    private func export(_ format: MeshExporter.Format) {
        do {
            exportedFile = ExportedFile(url: try controller.export(format: format))
        } catch {
            exportError = error.localizedDescription
        }
    }
}

// MARK: - Contenedor de ARView

private struct ARViewContainer: UIViewRepresentable {
    let arView: ARView

    func makeUIView(context: Context) -> ARView {
        arView
    }

    func updateUIView(_ uiView: ARView, context: Context) {}
}

// MARK: - Hoja de resultado

private struct ExportResultSheet: View {
    let url: URL
    let onDone: () -> Void
    let onNewScan: () -> Void

    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 56))
                    .foregroundStyle(.green)

                Text("Malla exportada")
                    .font(.title3.bold())

                Text(url.lastPathComponent)
                    .font(.footnote)
                    .foregroundStyle(.secondary)

                ShareLink(item: url) {
                    Label("Compartir archivo", systemImage: "square.and.arrow.up")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)

                Button("Escanear de nuevo", action: onNewScan)
                    .buttonStyle(.bordered)
                    .controlSize(.large)

                Button("Listo", action: onDone)
                    .controlSize(.large)

                Text("El archivo quedó guardado en “Mis modelos”. Ábrelo en tu laminador (Cura, PrusaSlicer, Bambu Studio…) para prepararlo e imprimirlo.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
            .padding()
            .presentationDetents([.medium, .large])
        }
    }
}
