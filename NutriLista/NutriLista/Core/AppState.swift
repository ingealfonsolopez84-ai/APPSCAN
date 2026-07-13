import Foundation
import SwiftUI
import Combine

/// Estado central: sesión, perfil y datos del menú activo.
/// El servidor (PostgreSQL con RLS) es la fuente de verdad; aquí solo se cachea.
@MainActor
final class AppState: ObservableObject {

    enum Route { case loading, welcome, onboarding, main }

    @Published var route: Route = .loading
    @Published var profile: Profile?
    @Published var currentMenu: Menu?
    @Published var meals: [Meal] = []
    @Published var pantry: [PantryItem] = []
    @Published var shoppingItems: [ShoppingItem] = []
    @Published var adherence: [AdherenceLog] = []
    @Published var prices: [ReferencePrice] = []
    @Published var errorMessage: String?

    let purchases = PurchaseManager()
    private var cancellables: Set<AnyCancellable> = []

    init() {
        // PurchaseManager es un ObservableObject anidado: reenviamos sus
        // cambios para que las vistas que leen state.purchases se actualicen.
        purchases.objectWillChange
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in self?.objectWillChange.send() }
            .store(in: &cancellables)
    }

    var isPro: Bool { profile?.isPro ?? false }

    // MARK: - Arranque y sesión

    func bootstrap() async {
        guard await SupabaseClient.shared.isSignedIn else {
            route = .welcome
            return
        }
        await loadEverything()
    }

    func didSignIn() async {
        await loadEverything()
    }

    func signOut() async {
        await SupabaseClient.shared.signOut()
        profile = nil
        currentMenu = nil
        meals = []
        pantry = []
        shoppingItems = []
        adherence = []
        route = .welcome
    }

    func deleteAccount() async {
        do {
            _ = try await SupabaseClient.shared.invoke("delete-account", body: [:])
            await signOut()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func loadEverything() async {
        do {
            guard let userID = await SupabaseClient.shared.currentUserID else {
                route = .welcome
                return
            }
            let profiles: [Profile] = try await SupabaseClient.shared.select(
                "profiles",
                query: [.init(name: "id", value: "eq.\(userID.uuidString)")]
            )
            guard let loaded = profiles.first else {
                route = .welcome
                return
            }
            profile = loaded

            async let menusTask: [Menu] = SupabaseClient.shared.select(
                "menus",
                query: [.init(name: "order", value: "created_at.desc"), .init(name: "limit", value: "1")]
            )
            async let pantryTask: [PantryItem] = SupabaseClient.shared.select(
                "pantry_items", query: [.init(name: "order", value: "created_at.asc")]
            )
            async let pricesTask: [ReferencePrice] = SupabaseClient.shared.select("reference_prices")

            currentMenu = try await menusTask.first
            pantry = try await pantryTask
            prices = try await pricesTask

            if let menu = currentMenu {
                async let mealsTask: [Meal] = SupabaseClient.shared.select(
                    "meals", query: [.init(name: "menu_id", value: "eq.\(menu.id.uuidString)")]
                )
                async let itemsTask: [ShoppingItem] = SupabaseClient.shared.select(
                    "shopping_items", query: [.init(name: "menu_id", value: "eq.\(menu.id.uuidString)")]
                )
                meals = try await mealsTask
                shoppingItems = try await itemsTask
                await loadAdherence()
            }

            await refreshEntitlements()
            route = loaded.onboardingDone ? .main : .onboarding
        } catch {
            errorMessage = error.localizedDescription
            route = .welcome
        }
    }

    // MARK: - Perfil / onboarding

    func saveProfile(shoppingDay: Int, store: String, householdSize: Int, allergies: [String]) async {
        guard var updated = profile else { return }
        updated.shoppingDay = shoppingDay
        updated.favoriteStore = store
        updated.householdSize = householdSize
        updated.allergies = allergies
        updated.onboardingDone = true
        do {
            struct Patch: Encodable {
                let shopping_day: Int
                let favorite_store: String
                let household_size: Int
                let allergies: [String]
                let onboarding_done: Bool
            }
            try await SupabaseClient.shared.update(
                "profiles",
                values: Patch(
                    shopping_day: shoppingDay,
                    favorite_store: store,
                    household_size: householdSize,
                    allergies: allergies,
                    onboarding_done: true
                ),
                query: [.init(name: "id", value: "eq.\(updated.id.uuidString)")]
            )
            profile = updated
            route = .main
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Escaneo de menú

    func scanMenu(imageData: Data, mediaType: String) async throws -> ScannedMenu {
        let data = try await SupabaseClient.shared.invoke("scan-menu", body: [
            "image_base64": imageData.base64EncodedString(),
            "media_type": mediaType,
        ])
        struct Wrapper: Decodable { let menu: ScannedMenu }
        return try JSONDecoder().decode(Wrapper.self, from: data).menu
    }

    /// Guarda el menú confirmado: crea menú + comidas y regenera la lista.
    func saveScannedMenu(_ scanned: ScannedMenu) async {
        guard let userID = await SupabaseClient.shared.currentUserID else { return }
        do {
            let menu = Menu(id: UUID(), userId: userID, title: scanned.title)
            struct MenuInsert: Encodable { let id: UUID; let user_id: UUID; let title: String }
            try await SupabaseClient.shared.insert(
                "menus", values: [MenuInsert(id: menu.id, user_id: userID, title: scanned.title)]
            )

            var newMeals: [Meal] = []
            for day in scanned.days {
                for meal in day.meals {
                    newMeals.append(Meal(
                        id: UUID(), menuId: menu.id, userId: userID,
                        dayOfWeek: day.dayOfWeek, slot: meal.slot, name: meal.name,
                        ingredients: meal.ingredients, kcal: meal.kcal,
                        proteinG: meal.proteinG, carbsG: meal.carbsG, fatG: meal.fatG
                    ))
                }
            }
            try await SupabaseClient.shared.insert("meals", values: newMeals)

            currentMenu = menu
            meals = newMeals
            adherence = []
            try await regenerateShoppingList()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Lista de compras

    /// Agrega ingredientes de todas las comidas, descuenta la despensa y
    /// estima precios con la base de referencia del súper favorito.
    func regenerateShoppingList() async throws {
        guard let menu = currentMenu, let userID = await SupabaseClient.shared.currentUserID else { return }

        struct Aggregate {
            var quantity: Double
            var unit: String
            var category: String
            var extraUnits: Set<String> = []
        }
        var aggregated: [String: Aggregate] = [:]
        for meal in meals {
            for ingredient in meal.ingredients {
                let key = ingredient.name.normalizedForMatching
                if var existing = aggregated[key] {
                    if existing.unit == ingredient.unit {
                        existing.quantity += ingredient.quantity
                    } else {
                        existing.extraUnits.insert("\(Self.trimmed(ingredient.quantity)) \(ingredient.unit)")
                    }
                    aggregated[key] = existing
                } else {
                    aggregated[key] = Aggregate(
                        quantity: ingredient.quantity,
                        unit: ingredient.unit,
                        category: ingredient.category
                    )
                }
            }
        }

        let pantryNames = Set(pantry.map { $0.name.normalizedForMatching })
        let store = profile?.favoriteStore ?? "Walmart"

        var items: [ShoppingItem] = []
        for (name, info) in aggregated {
            if pantryNames.contains(where: { name.contains($0) || $0.contains(name) }) { continue }
            var quantityText = "\(Self.trimmed(info.quantity)) \(info.unit)"
            if !info.extraUnits.isEmpty {
                quantityText += " + " + info.extraUnits.sorted().joined(separator: " + ")
            }
            items.append(ShoppingItem(
                id: UUID(), userId: userID, menuId: menu.id,
                name: name.capitalized(with: Locale(identifier: "es_MX")),
                quantityText: quantityText,
                category: info.category,
                priceEstimate: matchPrice(normalizedName: name, store: store),
                checked: false
            ))
        }
        items.sort { ($0.category, $0.name) < ($1.category, $1.name) }

        try await SupabaseClient.shared.delete(
            "shopping_items", query: [.init(name: "menu_id", value: "eq.\(menu.id.uuidString)")]
        )
        try await SupabaseClient.shared.insert("shopping_items", values: items)
        shoppingItems = items
    }

    func matchPrice(normalizedName: String, store: String) -> Double? {
        prices.first {
            $0.store == store &&
            (normalizedName.contains($0.normalized) || $0.normalized.contains(normalizedName))
        }?.price
    }

    func toggleShoppingItem(_ item: ShoppingItem) async {
        guard let index = shoppingItems.firstIndex(where: { $0.id == item.id }) else { return }
        shoppingItems[index].checked.toggle()
        struct Patch: Encodable { let checked: Bool }
        try? await SupabaseClient.shared.update(
            "shopping_items",
            values: Patch(checked: shoppingItems[index].checked),
            query: [.init(name: "id", value: "eq.\(item.id.uuidString)")]
        )
    }

    // MARK: - Despensa

    func addPantryItem(_ name: String) async {
        guard let userID = await SupabaseClient.shared.currentUserID,
              !name.trimmingCharacters(in: .whitespaces).isEmpty else { return }
        let item = PantryItem(id: UUID(), userId: userID, name: name)
        do {
            struct Insert: Encodable { let id: UUID; let user_id: UUID; let name: String }
            try await SupabaseClient.shared.insert(
                "pantry_items", values: [Insert(id: item.id, user_id: userID, name: name)]
            )
            pantry.append(item)
            try await regenerateShoppingList()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func removePantryItem(_ item: PantryItem) async {
        do {
            try await SupabaseClient.shared.delete(
                "pantry_items", query: [.init(name: "id", value: "eq.\(item.id.uuidString)")]
            )
            pantry.removeAll { $0.id == item.id }
            try await regenerateShoppingList()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Presupuesto

    struct BudgetEstimate {
        var low: Double
        var high: Double
        var matchedItems: Int
        var totalItems: Int
    }

    func budget(for store: String) -> BudgetEstimate {
        var total = 0.0
        var matched = 0
        for item in shoppingItems {
            let normalized = item.name.normalizedForMatching
            if let price = matchPrice(normalizedName: normalized, store: store) {
                total += price
                matched += 1
            }
        }
        return BudgetEstimate(
            low: (total * 0.9).rounded(),
            high: (total * 1.15).rounded(),
            matchedItems: matched,
            totalItems: shoppingItems.count
        )
    }

    // MARK: - Adherencia

    func loadAdherence() async {
        guard currentMenu != nil else { return }
        do {
            adherence = try await SupabaseClient.shared.select("adherence_logs")
        } catch {
            adherence = []
        }
    }

    func isMealDoneToday(_ meal: Meal) -> Bool {
        adherence.contains { $0.mealId == meal.id && $0.logDate == Self.todayString() }
    }

    func toggleMealDone(_ meal: Meal) async {
        guard let userID = await SupabaseClient.shared.currentUserID else { return }
        do {
            if let log = adherence.first(where: { $0.mealId == meal.id && $0.logDate == Self.todayString() }) {
                try await SupabaseClient.shared.delete(
                    "adherence_logs", query: [.init(name: "id", value: "eq.\(log.id.uuidString)")]
                )
                adherence.removeAll { $0.id == log.id }
            } else {
                let log = AdherenceLog(id: UUID(), userId: userID, mealId: meal.id, logDate: Self.todayString())
                struct Insert: Encodable {
                    let id: UUID; let user_id: UUID; let meal_id: UUID; let log_date: String
                }
                try await SupabaseClient.shared.insert(
                    "adherence_logs",
                    values: [Insert(id: log.id, user_id: userID, meal_id: meal.id, log_date: log.logDate)]
                )
                adherence.append(log)
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    /// Proporción de comidas de esta semana marcadas como cumplidas.
    var weeklyAdherence: Double {
        guard !meals.isEmpty else { return 0 }
        let weekLogs = Set(adherence.map(\.mealId))
        let done = meals.filter { weekLogs.contains($0.id) }.count
        return Double(done) / Double(meals.count)
    }

    // MARK: - Suscripción

    func refreshEntitlements() async {
        await purchases.refresh()
        if let jws = purchases.latestTransactionJWS {
            do {
                let data = try await SupabaseClient.shared.invoke("verify-subscription", body: [
                    "signed_transaction": jws,
                ])
                struct Result: Decodable { let is_pro: Bool }
                let result = try JSONDecoder().decode(Result.self, from: data)
                profile?.isPro = result.is_pro
            } catch {
                // Sin red o error transitorio: se conserva el último estado conocido.
            }
        }
    }

    // MARK: - Helpers

    static func todayString() -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.timeZone = .current
        return formatter.string(from: Date())
    }

    static func trimmed(_ value: Double) -> String {
        value.truncatingRemainder(dividingBy: 1) == 0
            ? String(Int(value))
            : String(format: "%.1f", value)
    }
}
