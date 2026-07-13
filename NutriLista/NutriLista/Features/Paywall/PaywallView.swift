import SwiftUI
import StoreKit

/// Paywall: aparece solo cuando el valor ya se demostró (cuota agotada o
/// al tocar una función Pro), nunca al abrir la app.
struct PaywallView: View {
    @EnvironmentObject private var state: AppState
    @Environment(\.dismiss) private var dismiss
    @State private var selectedProduct: Product?
    @State private var isPurchasing = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    Image(systemName: "sparkles")
                        .font(.system(size: 48))
                        .foregroundStyle(Color.accentColor)

                    Text("NutriLista Pro")
                        .font(.largeTitle.bold())
                    Text("Tu dieta, en piloto automático")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)

                    VStack(alignment: .leading, spacing: 12) {
                        benefit("camera.viewfinder", "Escaneos de menú ilimitados")
                        benefit("chart.bar.fill", "Comparador de precios entre súpers")
                        benefit("book.closed.fill", "Recetario completo con macros")
                        benefit("person.2.fill", "Lista compartida con tu familia (próximamente)")
                        benefit("doc.text.fill", "Reporte para tu nutriólogo (próximamente)")
                    }
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(.secondarySystemGroupedBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 16))

                    if state.purchases.products.isEmpty {
                        ProgressView("Cargando planes…")
                    } else {
                        ForEach(state.purchases.products, id: \.id) { product in
                            productRow(product)
                        }
                    }

                    Button {
                        guard let product = selectedProduct ?? state.purchases.products.last else { return }
                        isPurchasing = true
                        Task {
                            let success = await state.purchases.purchase(product)
                            if success {
                                await state.refreshEntitlements()
                                dismiss()
                            }
                            isPurchasing = false
                        }
                    } label: {
                        Group {
                            if isPurchasing {
                                ProgressView()
                            } else {
                                Text("Continuar").font(.headline)
                            }
                        }
                        .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                    .disabled(state.purchases.products.isEmpty || isPurchasing)

                    VStack(spacing: 6) {
                        Button("Restaurar compras") {
                            Task {
                                await state.purchases.restore()
                                await state.refreshEntitlements()
                                if state.isPro { dismiss() }
                            }
                        }
                        .font(.footnote)

                        Text("Suscripción con renovación automática; cancela cuando quieras desde Ajustes. El pago se carga a tu cuenta de App Store.")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                    }
                }
                .padding()
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Ahora no") { dismiss() }
                }
            }
            .task {
                await state.purchases.loadProducts()
                selectedProduct = state.purchases.products.last // anual por defecto
            }
            .alert("No se pudo completar la compra", isPresented: .init(
                get: { state.purchases.purchaseError != nil },
                set: { if !$0 { state.purchases.purchaseError = nil } }
            )) {
                Button("Aceptar", role: .cancel) {}
            } message: {
                Text(state.purchases.purchaseError ?? "")
            }
        }
    }

    private func benefit(_ icon: String, _ text: String) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .foregroundStyle(Color.accentColor)
                .frame(width: 26)
            Text(text).font(.subheadline)
        }
    }

    private func productRow(_ product: Product) -> some View {
        let isSelected = selectedProduct?.id == product.id
        let isYearly = product.id == Config.yearlyProductID
        return Button {
            selectedProduct = product
        } label: {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(isYearly ? "Anual" : "Mensual").font(.headline)
                    Text(product.displayPrice + (isYearly ? " al año" : " al mes"))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                if isYearly {
                    Text("Mejor precio")
                        .font(.caption2.bold())
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(Color.accentColor.opacity(0.15))
                        .foregroundStyle(Color.accentColor)
                        .clipShape(Capsule())
                }
                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .font(.title3)
                    .foregroundStyle(isSelected ? Color.accentColor : Color(.systemGray3))
            }
            .padding()
            .background(Color(.secondarySystemGroupedBackground))
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(isSelected ? Color.accentColor : .clear, lineWidth: 2)
            )
            .clipShape(RoundedRectangle(cornerRadius: 14))
        }
        .buttonStyle(.plain)
    }
}
