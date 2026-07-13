import SwiftUI
import AuthenticationServices
import CryptoKit

/// Pantalla de bienvenida con Sign in with Apple.
/// El identity token de Apple se intercambia por una sesión de Supabase;
/// la app nunca ve ni almacena contraseñas.
struct WelcomeView: View {
    @EnvironmentObject private var state: AppState
    @State private var currentNonce: String?
    @State private var isSigningIn = false

    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            Image(systemName: "carrot.fill")
                .font(.system(size: 60))
                .foregroundStyle(Color.accentColor)

            Text("NutriLista")
                .font(.largeTitle.bold())

            Text("Del menú de tu nutriólogo a tu carrito del súper: foto, lista de compras, presupuesto y recetario.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)

            Spacer()

            if isSigningIn {
                ProgressView("Iniciando sesión…")
            } else {
                SignInWithAppleButton(.signIn) { request in
                    let nonce = Self.randomNonce()
                    currentNonce = nonce
                    request.requestedScopes = [.fullName, .email]
                    request.nonce = Self.sha256(nonce)
                } onCompletion: { result in
                    handleAppleResult(result)
                }
                .signInWithAppleButtonStyle(.black)
                .frame(height: 52)
                .padding(.horizontal, 24)
            }

            Text("Tus datos de dieta se guardan cifrados y solo tú puedes verlos. Puedes eliminar tu cuenta y toda tu información cuando quieras.")
                .font(.caption2)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
                .padding(.bottom, 16)
        }
    }

    private func handleAppleResult(_ result: Result<ASAuthorization, Error>) {
        switch result {
        case .failure(let error):
            let nsError = error as NSError
            // Cancelación del usuario: no es un error que mostrar.
            if nsError.code != ASAuthorizationError.canceled.rawValue {
                state.errorMessage = error.localizedDescription
            }
        case .success(let authorization):
            guard
                let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
                let tokenData = credential.identityToken,
                let idToken = String(data: tokenData, encoding: .utf8),
                let nonce = currentNonce
            else {
                state.errorMessage = "No se pudo leer la credencial de Apple."
                return
            }
            isSigningIn = true
            Task {
                do {
                    _ = try await SupabaseClient.shared.signInWithApple(idToken: idToken, nonce: nonce)
                    await state.didSignIn()
                } catch {
                    state.errorMessage = error.localizedDescription
                }
                isSigningIn = false
            }
        }
    }

    // MARK: - Nonce (previene repetición del token)

    private static func randomNonce(length: Int = 32) -> String {
        let charset = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-._")
        var result = ""
        for _ in 0..<length {
            var random: UInt8 = 0
            _ = SecRandomCopyBytes(kSecRandomDefault, 1, &random)
            result.append(charset[Int(random) % charset.count])
        }
        return result
    }

    private static func sha256(_ input: String) -> String {
        SHA256.hash(data: Data(input.utf8))
            .map { String(format: "%02x", $0) }
            .joined()
    }
}
