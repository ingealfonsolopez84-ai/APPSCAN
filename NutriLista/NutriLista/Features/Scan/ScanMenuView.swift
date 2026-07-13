import SwiftUI
import PhotosUI

/// El momento mágico: foto del menú → IA → menú estructurado para confirmar.
struct ScanMenuView: View {
    @EnvironmentObject private var state: AppState
    @Environment(\.dismiss) private var dismiss

    enum Phase {
        case pickImage
        case processing
        case confirm(ScannedMenu)
        case notAMenu
        case quotaReached
    }

    @State private var phase: Phase = .pickImage
    @State private var photoItem: PhotosPickerItem?
    @State private var showCamera = false
    @State private var showPaywall = false

    var body: some View {
        NavigationStack {
            content
                .navigationTitle("Escanear menú")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Cerrar") { dismiss() }
                    }
                }
        }
        .sheet(isPresented: $showCamera) {
            CameraPicker { image in
                process(image)
            }
            .ignoresSafeArea()
        }
        .sheet(isPresented: $showPaywall) {
            PaywallView()
        }
        .onChange(of: photoItem) { _, newItem in
            guard let newItem else { return }
            Task {
                if let data = try? await newItem.loadTransferable(type: Data.self),
                   let image = UIImage(data: data) {
                    process(image)
                }
            }
        }
    }

    @ViewBuilder
    private var content: some View {
        switch phase {
        case .pickImage:
            VStack(spacing: 24) {
                Spacer()
                Image(systemName: "doc.viewfinder")
                    .font(.system(size: 64))
                    .foregroundStyle(Color.accentColor)
                Text("Tómale una foto al plan de tu nutriólogo")
                    .font(.title3.bold())
                    .multilineTextAlignment(.center)
                Text("Funciona con menús impresos o escritos a mano. Procura buena luz y que se lea completo. La foto se procesa y se descarta: nunca se guarda.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)
                Spacer()

                Button {
                    showCamera = true
                } label: {
                    Label("Tomar foto", systemImage: "camera.fill")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)

                PhotosPicker(selection: $photoItem, matching: .images) {
                    Label("Elegir de mis fotos", systemImage: "photo.on.rectangle")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                .controlSize(.large)
            }
            .padding()

        case .processing:
            VStack(spacing: 20) {
                Spacer()
                ProgressView()
                    .controlSize(.large)
                Text("Leyendo tu menú…")
                    .font(.headline)
                Text("La IA está identificando comidas, ingredientes y su información nutricional. Suele tardar menos de un minuto.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)
                Spacer()
            }

        case .confirm(let scanned):
            ConfirmMenuView(scanned: scanned) {
                dismiss()
            } onRetry: {
                phase = .pickImage
            }

        case .notAMenu:
            resultMessage(
                icon: "questionmark.circle",
                title: "Esto no parece un menú",
                message: "No encontramos un plan de alimentación en la foto. Intenta con otra imagen donde el menú se lea completo."
            )

        case .quotaReached:
            VStack(spacing: 20) {
                Spacer()
                Image(systemName: "sparkles")
                    .font(.system(size: 56))
                    .foregroundStyle(.orange)
                Text("Alcanzaste tus \(Config.freeScansPerMonth) escaneos gratis del mes")
                    .font(.title3.bold())
                    .multilineTextAlignment(.center)
                Text("Con NutriLista Pro escaneas menús ilimitados, comparas precios entre súpers y desbloqueas el recetario completo.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)
                Button {
                    showPaywall = true
                } label: {
                    Text("Conocer NutriLista Pro")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                Spacer()
            }
            .padding()
        }
    }

    private func resultMessage(icon: String, title: String, message: String) -> some View {
        VStack(spacing: 20) {
            Spacer()
            Image(systemName: icon)
                .font(.system(size: 56))
                .foregroundStyle(.secondary)
            Text(title).font(.title3.bold())
            Text(message)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
            Button("Intentar de nuevo") { phase = .pickImage }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
            Spacer()
        }
        .padding()
    }

    private func process(_ image: UIImage) {
        phase = .processing
        Task {
            // Redimensionar para controlar costo y tiempo (el texto sigue legible).
            let resized = image.resized(maxDimension: 1600)
            guard let jpeg = resized.jpegData(compressionQuality: 0.8) else {
                state.errorMessage = "No se pudo procesar la imagen."
                phase = .pickImage
                return
            }
            do {
                let scanned = try await state.scanMenu(imageData: jpeg, mediaType: "image/jpeg")
                phase = scanned.isMenu && !scanned.days.isEmpty ? .confirm(scanned) : .notAMenu
            } catch SupabaseClient.SupaError.quotaExceeded {
                phase = .quotaReached
            } catch {
                state.errorMessage = error.localizedDescription
                phase = .pickImage
            }
        }
    }
}

extension UIImage {
    func resized(maxDimension: CGFloat) -> UIImage {
        let largest = max(size.width, size.height)
        guard largest > maxDimension else { return self }
        let scale = maxDimension / largest
        let newSize = CGSize(width: size.width * scale, height: size.height * scale)
        let renderer = UIGraphicsImageRenderer(size: newSize)
        return renderer.image { _ in
            draw(in: CGRect(origin: .zero, size: newSize))
        }
    }
}
