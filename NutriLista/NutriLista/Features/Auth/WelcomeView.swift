import SwiftUI

/// Pantalla de bienvenida con correo y contraseña (vía Supabase Auth).
/// Modo de pruebas: no requiere Sign in with Apple, así que funciona con una
/// cuenta gratuita de desarrollador de Apple.
struct WelcomeView: View {
    @EnvironmentObject private var state: AppState

    private enum Mode { case signIn, signUp }

    @State private var mode: Mode = .signUp
    @State private var email = ""
    @State private var password = ""
    @State private var isWorking = false
    @FocusState private var focused: Field?

    private enum Field { case email, password }

    private var canSubmit: Bool {
        email.contains("@") && password.count >= 6 && !isWorking
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                Spacer(minLength: 40)

                Image(systemName: "carrot.fill")
                    .font(.system(size: 56))
                    .foregroundStyle(Color.accentColor)

                Text("NutriLista")
                    .font(.largeTitle.bold())

                Text("Del menú de tu nutriólogo a tu carrito del súper.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)

                Picker("", selection: $mode) {
                    Text("Crear cuenta").tag(Mode.signUp)
                    Text("Iniciar sesión").tag(Mode.signIn)
                }
                .pickerStyle(.segmented)
                .padding(.horizontal, 24)
                .padding(.top, 8)

                VStack(spacing: 12) {
                    TextField("Correo electrónico", text: $email)
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .focused($focused, equals: .email)
                        .submitLabel(.next)
                        .onSubmit { focused = .password }
                        .padding()
                        .background(Color(.secondarySystemBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 12))

                    SecureField("Contraseña (mínimo 6 caracteres)", text: $password)
                        .textContentType(mode == .signUp ? .newPassword : .password)
                        .focused($focused, equals: .password)
                        .submitLabel(.go)
                        .onSubmit { if canSubmit { submit() } }
                        .padding()
                        .background(Color(.secondarySystemBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .padding(.horizontal, 24)

                Button(action: submit) {
                    Group {
                        if isWorking {
                            ProgressView()
                        } else {
                            Text(mode == .signUp ? "Crear cuenta" : "Entrar")
                                .font(.headline)
                        }
                    }
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .disabled(!canSubmit)
                .padding(.horizontal, 24)

                Text("Tus datos de dieta se guardan cifrados y solo tú puedes verlos. Puedes eliminar tu cuenta y toda tu información cuando quieras.")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
                    .padding(.bottom, 24)
            }
        }
        .scrollDismissesKeyboard(.interactively)
    }

    private func submit() {
        focused = nil
        isWorking = true
        let emailValue = email.trimmingCharacters(in: .whitespacesAndNewlines)
        Task {
            do {
                switch mode {
                case .signUp:
                    _ = try await SupabaseClient.shared.signUpWithEmail(emailValue, password: password)
                case .signIn:
                    _ = try await SupabaseClient.shared.signInWithEmail(emailValue, password: password)
                }
                await state.didSignIn()
            } catch {
                state.errorMessage = friendlyMessage(for: error)
            }
            isWorking = false
        }
    }

    private func friendlyMessage(for error: Error) -> String {
        if case SupabaseClient.SupaError.http(let code, _) = error {
            switch code {
            case 400 where mode == .signIn:
                return "Correo o contraseña incorrectos."
            case 400, 422:
                return "Revisa el correo y la contraseña (mínimo 6 caracteres). Si ya tienes cuenta, usa Iniciar sesión."
            default:
                break
            }
        }
        return "No se pudo completar. Verifica tu conexión y que el proyecto de Supabase esté configurado en Config.swift."
    }
}
