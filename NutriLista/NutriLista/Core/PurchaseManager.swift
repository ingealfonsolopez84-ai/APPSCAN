import Foundation
import StoreKit

/// Suscripciones con StoreKit 2. La fuente de verdad del estado Pro es el
/// servidor (Edge Function verify-subscription), pero aquí se refleja el
/// entitlement local para respuesta inmediata en la interfaz.
@MainActor
final class PurchaseManager: ObservableObject {

    @Published private(set) var products: [Product] = []
    @Published private(set) var hasActiveSubscription = false
    @Published var purchaseError: String?

    /// Última transacción firmada (JWS) para verificar en el servidor.
    private(set) var latestTransactionJWS: String?

    private var updatesTask: Task<Void, Never>?

    init() {
        updatesTask = Task { [weak self] in
            for await update in StoreKit.Transaction.updates {
                await self?.handle(update)
            }
        }
    }

    deinit { updatesTask?.cancel() }

    func loadProducts() async {
        guard products.isEmpty else { return }
        do {
            products = try await Product.products(
                for: [Config.monthlyProductID, Config.yearlyProductID]
            ).sorted { $0.price < $1.price }
        } catch {
            purchaseError = "No se pudieron cargar los planes: \(error.localizedDescription)"
        }
    }

    func purchase(_ product: Product) async -> Bool {
        do {
            let result = try await product.purchase()
            switch result {
            case .success(let verification):
                await handle(verification)
                return hasActiveSubscription
            case .userCancelled, .pending:
                return false
            @unknown default:
                return false
            }
        } catch {
            purchaseError = error.localizedDescription
            return false
        }
    }

    func restore() async {
        try? await AppStore.sync()
        await refresh()
    }

    /// Revisa los entitlements vigentes en el dispositivo.
    func refresh() async {
        var active = false
        for await entitlement in StoreKit.Transaction.currentEntitlements {
            guard case .verified(let transaction) = entitlement else { continue }
            if [Config.monthlyProductID, Config.yearlyProductID].contains(transaction.productID),
               transaction.revocationDate == nil {
                active = true
                latestTransactionJWS = entitlement.jwsRepresentation
            }
        }
        hasActiveSubscription = active
    }

    private func handle(_ verification: VerificationResult<StoreKit.Transaction>) async {
        guard case .verified(let transaction) = verification else { return }
        latestTransactionJWS = verification.jwsRepresentation
        await transaction.finish()
        await refresh()
    }
}
