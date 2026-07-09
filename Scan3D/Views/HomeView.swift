import SwiftUI

struct HomeView: View {
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    header

                    if !DeviceCapability.supportsAnyScanning {
                        UnsupportedDeviceBanner()
                    }

                    NavigationLink {
                        ObjectCaptureFlowView()
                    } label: {
                        ModeCard(
                            icon: "cube.transparent",
                            title: "Escanear objeto",
                            subtitle: "Captura guiada de alta calidad para piezas pequeñas y medianas. Genera un modelo con textura (USDZ).",
                            enabled: DeviceCapability.supportsObjectCapture
                        )
                    }
                    .disabled(!DeviceCapability.supportsObjectCapture)

                    NavigationLink {
                        LiDARScanView()
                    } label: {
                        ModeCard(
                            icon: "square.3.layers.3d.down.right",
                            title: "Escaneo LiDAR",
                            subtitle: "Malla rápida de espacios y objetos grandes. Exporta STL u OBJ en milímetros, listos para laminar e imprimir.",
                            enabled: DeviceCapability.supportsLiDARMesh
                        )
                    }
                    .disabled(!DeviceCapability.supportsLiDARMesh)

                    NavigationLink {
                        LibraryView()
                    } label: {
                        ModeCard(
                            icon: "folder",
                            title: "Mis modelos",
                            subtitle: "Revisa, comparte y exporta tus escaneos guardados.",
                            enabled: true
                        )
                    }
                }
                .padding()
            }
            .navigationTitle("Escáner 3D")
            .background(Color(.systemGroupedBackground))
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Convierte objetos reales en modelos 3D imprimibles usando la cámara y el sensor LiDAR de tu iPhone Pro.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}

private struct ModeCard: View {
    let icon: String
    let title: String
    let subtitle: String
    let enabled: Bool

    var body: some View {
        HStack(spacing: 14) {
            Image(systemName: icon)
                .font(.system(size: 30, weight: .medium))
                .foregroundStyle(enabled ? Color.accentColor : Color.secondary)
                .frame(width: 48)

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.headline)
                    .foregroundStyle(.primary)
                Text(enabled ? subtitle : "No disponible en este dispositivo.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.leading)
            }
            Spacer()
            Image(systemName: "chevron.right")
                .font(.footnote.weight(.semibold))
                .foregroundStyle(.tertiary)
        }
        .padding()
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .opacity(enabled ? 1 : 0.55)
    }
}

private struct UnsupportedDeviceBanner: View {
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundStyle(.orange)
            Text("Este dispositivo no tiene sensor LiDAR. El escaneo 3D requiere un iPhone Pro o Pro Max (iPhone 12 Pro o posterior) o un iPad Pro con LiDAR.")
                .font(.footnote)
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.orange.opacity(0.12))
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}

#Preview {
    HomeView()
}
