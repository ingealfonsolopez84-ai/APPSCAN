import SwiftUI

/// Recetario acumulado: todas las comidas del menú con sus macros,
/// búsqueda por platillo o ingrediente y palomita de cumplimiento.
struct RecipesView: View {
    @EnvironmentObject private var state: AppState
    @State private var search = ""

    private var filtered: [Meal] {
        let base = state.meals.sorted {
            ($0.dayOfWeek, $0.slotOrder) < ($1.dayOfWeek, $1.slotOrder)
        }
        guard !search.isEmpty else { return base }
        let term = search.normalizedForMatching
        return base.filter { meal in
            meal.name.normalizedForMatching.contains(term) ||
            meal.ingredients.contains { $0.name.normalizedForMatching.contains(term) }
        }
    }

    var body: some View {
        NavigationStack {
            Group {
                if state.meals.isEmpty {
                    ContentUnavailableView(
                        "Sin recetas todavía",
                        systemImage: "book.closed",
                        description: Text("Cada menú que escanees suma sus comidas aquí, con su desglose nutricional.")
                    )
                } else {
                    List {
                        ForEach(groupedByDay, id: \.day) { group in
                            Section(Weekday.name(group.day)) {
                                ForEach(group.meals) { meal in
                                    NavigationLink {
                                        MealDetailView(meal: meal)
                                    } label: {
                                        row(meal)
                                    }
                                }
                            }
                        }
                    }
                    .searchable(text: $search, prompt: "Buscar platillo o ingrediente")
                }
            }
            .navigationTitle("Recetario")
        }
    }

    private var groupedByDay: [(day: Int, meals: [Meal])] {
        Dictionary(grouping: filtered, by: \.dayOfWeek)
            .sorted { $0.key < $1.key }
            .map { (day: $0.key, meals: $0.value.sorted { $0.slotOrder < $1.slotOrder }) }
    }

    private func row(_ meal: Meal) -> some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text(meal.slotLabel)
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(Color.accentColor)
                    .textCase(.uppercase)
                Text(meal.name).font(.subheadline.weight(.medium))
                Text("\(meal.kcal ?? 0) kcal · P \(Int(meal.proteinG ?? 0)) · C \(Int(meal.carbsG ?? 0)) · G \(Int(meal.fatG ?? 0))")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .monospacedDigit()
            }
            Spacer()
            if state.isMealDoneToday(meal) {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundStyle(Color.accentColor)
            }
        }
    }
}

struct MealDetailView: View {
    @EnvironmentObject private var state: AppState
    let meal: Meal

    var body: some View {
        List {
            Section {
                MacroRow(meal: meal)
                    .listRowBackground(Color.clear)
                    .listRowInsets(EdgeInsets())
            }

            Section("Ingredientes") {
                ForEach(meal.ingredients, id: \.self) { ingredient in
                    HStack {
                        Text(ingredient.name.capitalized(with: Locale(identifier: "es_MX")))
                        Spacer()
                        Text("\(AppState.trimmed(ingredient.quantity)) \(ingredient.unit)")
                            .foregroundStyle(.secondary)
                            .monospacedDigit()
                    }
                }
            }

            Section {
                Button {
                    Task { await state.toggleMealDone(meal) }
                } label: {
                    Label(
                        state.isMealDoneToday(meal) ? "Cumplida hoy ✓" : "Marcar como cumplida hoy",
                        systemImage: state.isMealDoneToday(meal) ? "checkmark.circle.fill" : "circle"
                    )
                }
            } footer: {
                Text("Las comidas cumplidas alimentan tu adherencia semanal en la pestaña Hoy.")
            }
        }
        .navigationTitle(meal.name)
        .navigationBarTitleDisplayMode(.inline)
    }
}
