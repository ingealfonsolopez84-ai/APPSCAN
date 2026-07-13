import SwiftUI

struct RootView: View {
    @EnvironmentObject private var state: AppState

    var body: some View {
        Group {
            switch state.route {
            case .loading:
                ProgressView("Cargando…")
            case .welcome:
                WelcomeView()
            case .onboarding:
                OnboardingView()
            case .main:
                MainTabView()
            }
        }
        .alert("Algo salió mal", isPresented: .init(
            get: { state.errorMessage != nil },
            set: { if !$0 { state.errorMessage = nil } }
        )) {
            Button("Aceptar", role: .cancel) {}
        } message: {
            Text(state.errorMessage ?? "")
        }
    }
}
