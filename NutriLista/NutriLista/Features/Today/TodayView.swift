import SwiftUI

/// Pantalla principal: comidas de hoy, racha de adherencia y presupuesto.
struct TodayView: View {
    @EnvironmentObject private var state: AppState
    @State private var showScanner = false

    private var todayMeals: [Meal] {
        state.meals
            .filter { $0.dayOfWeek == Weekday.today() }
            .sorted { $0.slotOrder < $1.slotOrder }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    if state.meals.isEmpty {
                        emptyState
                    } else {
                        adherenceCard
                        budgetCard

                        if todayMeals.isEmpty {
                            ContentUnavailableView(
                                "Hoy no hay comidas programadas",
                                systemImage: "fork.knife",
                                description: Text("Tu menú no incluye comidas para \(Weekday.name(Weekday.today())).")
                            )
                        } else {
                            ForEach(todayMeals) { meal in
                                MealCard(meal: meal)
                            }
                        }
                    }
                }
                .padding()
            }
            .navigationTitle("Hoy · \(Weekday.name(Weekday.today()))")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        showScanner = true
                    } label: {
                        Label("Escanear menú", systemImage: "camera.viewfinder")
                    }
                }
            }
            .sheet(isPresented: $showScanner) {
                ScanMenuView()
            }
            .background(Color(.systemGroupedBackground))
        }
    }

    private var emptyState: some View {
        VStack(spacing: 20) {
            ContentUnavailableView(
                "Escanea tu primer menú",
                systemImage: "camera.viewfinder",
                description: Text("Tómale una foto al plan que te dio tu nutriólogo y NutriLista armará tu lista de compras, presupuesto y recetario.")
            )
            Button {
                showScanner = true
            } label: {
                Label("Escanear menú", systemImage: "camera.viewfinder")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
        }
        .padding(.top, 48)
    }

    private var adherenceCard: some View {
        HStack(spacing: 16) {
            ZStack {
                Circle().stroke(Color(.systemGray5), lineWidth: 8)
                Circle()
                    .trim(from: 0, to: state.weeklyAdherence)
                    .stroke(Color.accentColor, style: StrokeStyle(lineWidth: 8, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                Text("\(Int(state.weeklyAdherence * 100))%")
                    .font(.subheadline.bold())
                    .monospacedDigit()
            }
            .frame(width: 64, height: 64)

            VStack(alignment: .leading, spacing: 4) {
                Text("Adherencia de la semana").font(.headline)
                Text("Palomea cada comida cumplida en la pestaña Recetas o aquí mismo.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()
        }
        .padding()
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private var budgetCard: some View {
        let store = state.profile?.favoriteStore ?? "Walmart"
        let estimate = state.budget(for: store)
        return HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("Presupuesto estimado · \(store)").font(.headline)
                if estimate.matchedItems > 0 {
                    Text("$\(Int(estimate.low))–$\(Int(estimate.high)) MXN")
                        .font(.title3.bold())
                        .monospacedDigit()
                        .foregroundStyle(Color.accentColor)
                    Text("\(estimate.matchedItems) de \(estimate.totalItems) artículos con precio de referencia")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                } else {
                    Text("Genera tu lista para ver el estimado.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            Spacer()
            Image(systemName: "cart")
                .font(.title2)
                .foregroundStyle(.secondary)
        }
        .padding()
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}

/// Tarjeta de comida con macros y palomita de cumplimiento.
struct MealCard: View {
    @EnvironmentObject private var state: AppState
    let meal: Meal

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(meal.slotLabel)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(Color.accentColor)
                        .textCase(.uppercase)
                    Text(meal.name).font(.headline)
                }
                Spacer()
                Button {
                    Task { await state.toggleMealDone(meal) }
                } label: {
                    Image(systemName: state.isMealDoneToday(meal) ? "checkmark.circle.fill" : "circle")
                        .font(.title2)
                        .foregroundStyle(state.isMealDoneToday(meal) ? Color.accentColor : Color(.systemGray3))
                }
                .buttonStyle(.plain)
            }

            if !meal.ingredients.isEmpty {
                Text(meal.ingredients.map(\.name).joined(separator: " · "))
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }

            MacroRow(meal: meal)
        }
        .padding()
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}

struct MacroRow: View {
    let meal: Meal

    var body: some View {
        HStack(spacing: 8) {
            macro("\(meal.kcal ?? 0)", "kcal")
            macro(grams(meal.proteinG), "prot")
            macro(grams(meal.carbsG), "carb")
            macro(grams(meal.fatG), "grasa")
        }
    }

    private func grams(_ value: Double?) -> String {
        guard let value else { return "—" }
        return "\(Int(value)) g"
    }

    private func macro(_ value: String, _ label: String) -> some View {
        VStack(spacing: 2) {
            Text(value).font(.footnote.bold()).monospacedDigit()
            Text(label).font(.caption2).foregroundStyle(.secondary).textCase(.uppercase)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 6)
        .background(Color(.systemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}
