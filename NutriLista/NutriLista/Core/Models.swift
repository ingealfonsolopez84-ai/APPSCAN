import Foundation

// MARK: - Perfil

struct Profile: Codable, Equatable {
    var id: UUID
    var displayName: String?
    var shoppingDay: Int?       // 1 = lunes … 7 = domingo
    var favoriteStore: String?
    var householdSize: Int
    var allergies: [String]
    var onboardingDone: Bool
    var isPro: Bool

    enum CodingKeys: String, CodingKey {
        case id
        case displayName = "display_name"
        case shoppingDay = "shopping_day"
        case favoriteStore = "favorite_store"
        case householdSize = "household_size"
        case allergies
        case onboardingDone = "onboarding_done"
        case isPro = "is_pro"
    }
}

// MARK: - Menú y comidas

struct Menu: Codable, Identifiable, Equatable {
    var id: UUID
    var userId: UUID
    var title: String

    enum CodingKeys: String, CodingKey {
        case id, title
        case userId = "user_id"
    }
}

struct Ingredient: Codable, Hashable {
    var name: String
    var quantity: Double
    var unit: String
    var category: String // frutas_verduras | proteinas | lacteos | abarrotes | otros
}

struct Meal: Codable, Identifiable, Equatable {
    var id: UUID
    var menuId: UUID
    var userId: UUID
    var dayOfWeek: Int
    var slot: String
    var name: String
    var ingredients: [Ingredient]
    var kcal: Int?
    var proteinG: Double?
    var carbsG: Double?
    var fatG: Double?

    enum CodingKeys: String, CodingKey {
        case id, slot, name, ingredients, kcal
        case menuId = "menu_id"
        case userId = "user_id"
        case dayOfWeek = "day_of_week"
        case proteinG = "protein_g"
        case carbsG = "carbs_g"
        case fatG = "fat_g"
    }

    var slotLabel: String {
        switch slot {
        case "desayuno": return "Desayuno"
        case "colacion_1": return "Colación matutina"
        case "comida": return "Comida"
        case "colacion_2": return "Colación vespertina"
        case "cena": return "Cena"
        default: return slot.capitalized
        }
    }

    var slotOrder: Int {
        ["desayuno", "colacion_1", "comida", "colacion_2", "cena"]
            .firstIndex(of: slot) ?? 9
    }
}

// MARK: - Despensa y lista

struct PantryItem: Codable, Identifiable, Equatable {
    var id: UUID
    var userId: UUID
    var name: String

    enum CodingKeys: String, CodingKey {
        case id, name
        case userId = "user_id"
    }
}

struct ShoppingItem: Codable, Identifiable, Equatable {
    var id: UUID
    var userId: UUID
    var menuId: UUID
    var name: String
    var quantityText: String
    var category: String
    var priceEstimate: Double?
    var checked: Bool

    enum CodingKeys: String, CodingKey {
        case id, name, category, checked
        case userId = "user_id"
        case menuId = "menu_id"
        case quantityText = "quantity_text"
        case priceEstimate = "price_estimate"
    }

    var categoryLabel: String {
        switch category {
        case "frutas_verduras": return "Frutas y verduras"
        case "proteinas": return "Carnes, pescado y huevo"
        case "lacteos": return "Lácteos"
        case "abarrotes": return "Abarrotes"
        default: return "Otros"
        }
    }
}

// MARK: - Adherencia

struct AdherenceLog: Codable, Identifiable, Equatable {
    var id: UUID
    var userId: UUID
    var mealId: UUID
    var logDate: String // "yyyy-MM-dd"

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case mealId = "meal_id"
        case logDate = "log_date"
    }
}

// MARK: - Precios de referencia

struct ReferencePrice: Codable, Identifiable, Equatable {
    var id: UUID
    var store: String
    var item: String
    var normalized: String
    var unit: String
    var price: Double
}

// MARK: - Respuesta del escaneo (Edge Function)

struct ScannedMenu: Codable {
    var isMenu: Bool
    var title: String
    var days: [ScannedDay]

    enum CodingKeys: String, CodingKey {
        case isMenu = "is_menu"
        case title, days
    }
}

struct ScannedDay: Codable {
    var dayOfWeek: Int
    var meals: [ScannedMeal]

    enum CodingKeys: String, CodingKey {
        case dayOfWeek = "day_of_week"
        case meals
    }
}

struct ScannedMeal: Codable, Identifiable {
    var id: UUID { UUID() }
    var slot: String
    var name: String
    var ingredients: [Ingredient]
    var kcal: Int
    var proteinG: Double
    var carbsG: Double
    var fatG: Double

    enum CodingKeys: String, CodingKey {
        case slot, name, ingredients, kcal
        case proteinG = "protein_g"
        case carbsG = "carbs_g"
        case fatG = "fat_g"
    }
}

// MARK: - Utilidades

extension String {
    /// minúsculas y sin acentos, para emparejar con precios de referencia
    var normalizedForMatching: String {
        folding(options: [.diacriticInsensitive, .caseInsensitive], locale: Locale(identifier: "es_MX"))
            .lowercased()
            .trimmingCharacters(in: .whitespacesAndNewlines)
    }
}

enum Weekday {
    static let names = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]

    static func name(_ dayOfWeek: Int) -> String {
        guard (1...7).contains(dayOfWeek) else { return "Día \(dayOfWeek)" }
        return names[dayOfWeek - 1]
    }

    /// 1 = lunes … 7 = domingo para la fecha dada
    static func today(_ date: Date = Date()) -> Int {
        let weekday = Calendar.current.component(.weekday, from: date) // 1 = domingo
        return weekday == 1 ? 7 : weekday - 1
    }
}
