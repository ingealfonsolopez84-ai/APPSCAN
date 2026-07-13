import SwiftUI

/// Revisión del menú detectado antes de guardarlo — nunca se asume que la
/// lectura de la IA fue perfecta.
struct ConfirmMenuView: View {
    @EnvironmentObject private var state: AppState
    let scanned: ScannedMenu
    let onDone: () -> Void
    let onRetry: () -> Void

    @State private var isSaving = false

    private var totalMeals: Int {
        scanned.days.reduce(0) { $0 + $1.meals.count }
    }

    private var allergyWarnings: [String] {
        guard let allergies = state.profile?.allergies, !allergies.isEmpty else { return [] }
        let ingredientText = scanned.days
            .flatMap(\.meals)
            .flatMap(\.ingredients)
            .map(\.name.normalizedForMatching)
            .joined(separator: " ")
        return allergies.filter { ingredientText.contains($0.normalizedForMatching) }
    }

    var body: some View {
        List {
            Section {
                HStack {
                    Image(systemName: "checkmark.seal.fill").foregroundStyle(Color.accentColor)
                    Text("Detectamos **\(totalMeals) comidas** en **\(scanned.days.count) día\(scanned.days.count == 1 ? "" : "s")**")
                }
                if !allergyWarnings.isEmpty {
                    Label(
                        "Ojo: este menú podría incluir \(allergyWarnings.joined(separator: ", ")), que marcaste como alergia.",
                        systemImage: "exclamationmark.triangle.fill"
                    )
                    .foregroundStyle(.orange)
                    .font(.subheadline)
                }
            }

            ForEach(scanned.days.sorted(by: { $0.dayOfWeek < $1.dayOfWeek }), id: \.dayOfWeek) { day in
                Section(Weekday.name(day.dayOfWeek)) {
                    ForEach(day.meals) { meal in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(meal.name).font(.subheadline.weight(.semibold))
                            Text(meal.ingredients.map {
                                "\(AppState.trimmed($0.quantity)) \($0.unit) \($0.name)"
                            }.joined(separator: " · "))
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            Text("\(meal.kcal) kcal · P \(Int(meal.proteinG)) g · C \(Int(meal.carbsG)) g · G \(Int(meal.fatG)) g")
                                .font(.caption2)
                                .foregroundStyle(.tertiary)
                                .monospacedDigit()
                        }
                        .padding(.vertical, 2)
                    }
                }
            }

            Section {
                Text("Al guardar se genera tu lista de compras con base en estos ingredientes y tu despensa.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .safeAreaInset(edge: .bottom) {
            VStack(spacing: 8) {
                Button {
                    isSaving = true
                    Task {
                        await state.saveScannedMenu(scanned)
                        isSaving = false
                        onDone()
                    }
                } label: {
                    Group {
                        if isSaving { ProgressView() } else { Text("Guardar y armar mi lista").font(.headline) }
                    }
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)

                Button("Volver a escanear", action: onRetry)
                    .font(.subheadline)
            }
            .padding()
            .background(.bar)
        }
    }
}
