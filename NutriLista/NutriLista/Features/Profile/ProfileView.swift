import SwiftUI

struct ProfileView: View {
    @EnvironmentObject private var state: AppState
    @State private var showPaywall = false
    @State private var confirmDelete = false

    var body: some View {
        NavigationStack {
            List {
                Section("Suscripción") {
                    if state.isPro {
                        Label("NutriLista Pro activo", systemImage: "checkmark.seal.fill")
                            .foregroundStyle(Color.accentColor)
                    } else {
                        Button {
                            showPaywall = true
                        } label: {
                            Label("Mejorar a NutriLista Pro", systemImage: "sparkles")
                        }
                    }
                    Button("Restaurar compras") {
                        Task {
                            await state.purchases.restore()
                            await state.refreshEntitlements()
                        }
                    }
                }

                Section("Mis hábitos") {
                    if let profile = state.profile {
                        LabeledContent("Día de súper", value: Weekday.name(profile.shoppingDay ?? 6))
                        LabeledContent("Súper favorito", value: profile.favoriteStore ?? "—")
                        LabeledContent("Personas en casa", value: "\(profile.householdSize)")
                        LabeledContent(
                            "Alergias",
                            value: profile.allergies.isEmpty ? "Ninguna" : profile.allergies.joined(separator: ", ")
                        )
                    }
                    Button("Editar hábitos") {
                        state.route = .onboarding
                    }
                }

                Section("Privacidad y legal") {
                    Link("Aviso de privacidad", destination: Config.privacyPolicyURL)
                    Link("Términos de uso", destination: Config.termsURL)
                }

                Section("Cuenta") {
                    Button("Cerrar sesión") {
                        Task { await state.signOut() }
                    }
                    Button("Eliminar mi cuenta y todos mis datos", role: .destructive) {
                        confirmDelete = true
                    }
                }

                Section {
                    Text("NutriLista no guarda las fotos de tus menús: se procesan y se descartan. Tus datos viven cifrados y solo tú puedes verlos.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Perfil")
            .sheet(isPresented: $showPaywall) { PaywallView() }
            .confirmationDialog(
                "¿Eliminar tu cuenta?",
                isPresented: $confirmDelete,
                titleVisibility: .visible
            ) {
                Button("Eliminar todo definitivamente", role: .destructive) {
                    Task { await state.deleteAccount() }
                }
                Button("Cancelar", role: .cancel) {}
            } message: {
                Text("Se borrarán tu perfil, menús, recetario, listas y adherencia. Esta acción no se puede deshacer.")
            }
        }
    }
}
