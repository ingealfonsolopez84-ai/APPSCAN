import SwiftUI
import RealityKit

/// Flujo completo de escaneo de objetos: introducción, captura guiada,
/// reconstrucción y resultado.
struct ObjectCaptureFlowView: View {
    @StateObject private var model = ObjectCaptureModel()
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        content
            .navigationBarBackButtonHidden(isCaptureActive)
            .toolbar {
                if isCaptureActive {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Cancelar") {
                            model.cancel()
                            dismiss()
                        }
                    }
                }
            }
    }

    private var isCaptureActive: Bool {
        if case .capturing = model.phase { return true }
        return false
    }

    @ViewBuilder
    private var content: some View {
        switch model.phase {
        case .notStarted:
            IntroView(onStart: { model.startCapture() })

        case .capturing:
            if let session = model.session {
                CaptureSessionView(session: session, model: model)
                    .ignoresSafeArea()
            } else {
                ProgressView("Iniciando cámara…")
            }

        case .reconstructing(let progress):
            ReconstructionProgressView(progress: progress)

        case .finished(let modelURL):
            CaptureResultView(modelURL: modelURL) {
                dismiss()
            }

        case .failed(let message):
            FailureView(message: message,
                        onRetry: { model.cancel(); model.startCapture() },
                        onClose: { model.cancel(); dismiss() })
        }
    }
}

// MARK: - Introducción

private struct IntroView: View {
    let onStart: () -> Void

    var body: some View {
        VStack(spacing: 24) {
            Spacer()
            Image(systemName: "cube.transparent")
                .font(.system(size: 64))
                .foregroundStyle(Color.accentColor)

            Text("Escaneo de objeto")
                .font(.title2.bold())

            VStack(alignment: .leading, spacing: 12) {
                InstructionRow(icon: "sun.max", text: "Usa un lugar bien iluminado y sin reflejos fuertes.")
                InstructionRow(icon: "square.dashed", text: "Coloca el objeto sobre una superficie despejada y con algo de contraste.")
                InstructionRow(icon: "arrow.triangle.2.circlepath", text: "Muévete despacio alrededor del objeto siguiendo la guía en pantalla.")
                InstructionRow(icon: "ruler", text: "Funciona mejor con objetos de 10 cm a 1 m, mates y con textura.")
            }
            .padding(.horizontal)

            Spacer()

            Button(action: onStart) {
                Text("Comenzar escaneo")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .padding(.horizontal)
            .padding(.bottom)
        }
        .navigationTitle("Escanear objeto")
        .navigationBarTitleDisplayMode(.inline)
    }
}

private struct InstructionRow: View {
    let icon: String
    let text: String

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon)
                .frame(width: 28)
                .foregroundStyle(Color.accentColor)
            Text(text)
                .font(.subheadline)
        }
    }
}

// MARK: - Sesión de captura

private struct CaptureSessionView: View {
    let session: ObjectCaptureSession
    @ObservedObject var model: ObjectCaptureModel

    var body: some View {
        ZStack {
            ObjectCaptureView(session: session)

            VStack {
                Spacer()
                controls
                    .padding(.bottom, 30)
            }
        }
    }

    @ViewBuilder
    private var controls: some View {
        switch session.state {
        case .ready:
            VStack(spacing: 12) {
                hint("Apunta al objeto y pulsa Continuar para detectarlo.")
                Button {
                    _ = session.startDetecting()
                } label: {
                    Text("Continuar")
                        .font(.headline)
                        .padding(.horizontal, 32)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
            }

        case .detecting:
            VStack(spacing: 12) {
                hint("Ajusta el recuadro al objeto y pulsa Iniciar captura.")
                HStack(spacing: 12) {
                    Button("Reiniciar") {
                        session.resetDetection()
                    }
                    .buttonStyle(.bordered)
                    .controlSize(.large)

                    Button {
                        session.startCapturing()
                    } label: {
                        Text("Iniciar captura")
                            .font(.headline)
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                }
            }

        case .capturing:
            VStack(spacing: 12) {
                if session.userCompletedScanPass {
                    hint("Pasada completa. Puedes finalizar y generar el modelo.")
                } else {
                    hint("Rodea el objeto despacio hasta completar el anillo. Fotos: \(session.numberOfShotsTaken)")
                }
                Button {
                    model.finishCapture()
                } label: {
                    Text("Finalizar y generar modelo")
                        .font(.headline)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
            }

        case .finishing:
            hint("Guardando capturas…")

        default:
            EmptyView()
        }
    }

    private func hint(_ text: String) -> some View {
        Text(text)
            .font(.subheadline)
            .multilineTextAlignment(.center)
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(.ultraThinMaterial, in: Capsule())
            .padding(.horizontal)
    }
}

// MARK: - Reconstrucción

private struct ReconstructionProgressView: View {
    let progress: Double

    var body: some View {
        VStack(spacing: 20) {
            Spacer()
            ProgressView(value: progress) {
                Text("Generando modelo 3D…")
                    .font(.headline)
            } currentValueLabel: {
                Text("\(Int(progress * 100)) %")
                    .monospacedDigit()
            }
            .progressViewStyle(.linear)
            .padding(.horizontal, 40)

            Text("La fotogrametría se procesa en el dispositivo. Mantén la app abierta; puede tardar varios minutos.")
                .font(.footnote)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
            Spacer()
        }
        .navigationTitle("Procesando")
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(true)
    }
}

// MARK: - Resultado

private struct CaptureResultView: View {
    let modelURL: URL
    let onDone: () -> Void
    @State private var showPreview = false

    var body: some View {
        VStack(spacing: 24) {
            Spacer()
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 64))
                .foregroundStyle(.green)

            Text("¡Modelo generado!")
                .font(.title2.bold())

            Text(modelURL.lastPathComponent)
                .font(.footnote)
                .foregroundStyle(.secondary)

            VStack(spacing: 12) {
                Button {
                    showPreview = true
                } label: {
                    Label("Ver en 3D / AR", systemImage: "arkit")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)

                ShareLink(item: modelURL) {
                    Label("Compartir USDZ", systemImage: "square.and.arrow.up")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                .controlSize(.large)

                Button("Listo", action: onDone)
                    .controlSize(.large)
            }
            .padding(.horizontal)

            Text("El modelo también quedó guardado en “Mis modelos”. Para imprimirlo, conviértelo a STL en tu laminador o comparte el USDZ con tu Mac.")
                .font(.footnote)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)

            Spacer()
        }
        .navigationTitle("Resultado")
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(true)
        .sheet(isPresented: $showPreview) {
            QuickLookPreview(url: modelURL)
                .ignoresSafeArea()
        }
    }
}

// MARK: - Error

private struct FailureView: View {
    let message: String
    let onRetry: () -> Void
    let onClose: () -> Void

    var body: some View {
        VStack(spacing: 20) {
            Spacer()
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 56))
                .foregroundStyle(.orange)
            Text("Algo salió mal")
                .font(.title3.bold())
            Text(message)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
            Button("Reintentar", action: onRetry)
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
            Button("Cerrar", action: onClose)
                .controlSize(.large)
            Spacer()
        }
    }
}
