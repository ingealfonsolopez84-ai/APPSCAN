import SwiftUI

/// Hábitos en 60 segundos: solo lo que la app usa de inmediato.
struct OnboardingView: View {
    @EnvironmentObject private var state: AppState

    @State private var shoppingDay = 6 // sábado
    @State private var store = "Walmart"
    @State private var householdSize = 2
    @State private var allergies: Set<String> = []
    @State private var isSaving = false

    private let stores = ["Walmart", "Soriana", "Chedraui", "HEB", "Mercado local"]
    private let allergyOptions = ["Lácteos", "Gluten", "Cacahuate", "Mariscos", "Huevo", "Soya"]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 28) {
                    section("¿Qué día haces el súper?") {
                        ChipGrid(options: Weekday.names, selection: .init(
                            get: { [Weekday.names[shoppingDay - 1]] },
                            set: { selected in
                                if let name = selected.first,
                                   let index = Weekday.names.firstIndex(of: name) {
                                    shoppingDay = index + 1
                                }
                            }
                        ), singleSelection: true)
                    }

                    section("¿Dónde compras normalmente?") {
                        ChipGrid(options: stores, selection: .init(
                            get: { [store] },
                            set: { if let s = $0.first { store = s } }
                        ), singleSelection: true)
                    }

                    section("¿Para cuántas personas cocinas?") {
                        Stepper(value: $householdSize, in: 1...12) {
                            Text("\(householdSize) persona\(householdSize == 1 ? "" : "s")")
                                .font(.headline)
                        }
                        .padding(.horizontal, 4)
                    }

                    section("¿Alguna alergia o alimento a evitar?") {
                        ChipGrid(options: allergyOptions, selection: .init(
                            get: { Array(allergies) },
                            set: { allergies = Set($0) }
                        ), singleSelection: false)
                        Text("Opcional. Lo usamos para avisarte si un menú los incluye.")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding()
            }
            .navigationTitle("Tu rutina")
            .safeAreaInset(edge: .bottom) {
                Button {
                    isSaving = true
                    Task {
                        await state.saveProfile(
                            shoppingDay: shoppingDay,
                            store: store,
                            householdSize: householdSize,
                            allergies: Array(allergies)
                        )
                        isSaving = false
                    }
                } label: {
                    Group {
                        if isSaving { ProgressView() } else { Text("Comenzar").font(.headline) }
                    }
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .padding()
                .background(.bar)
            }
        }
    }

    private func section(_ title: String, @ViewBuilder content: () -> some View) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title).font(.headline)
            content()
        }
    }
}

/// Chips seleccionables reutilizables.
struct ChipGrid: View {
    let options: [String]
    @Binding var selection: [String]
    var singleSelection: Bool

    private let columns = [GridItem(.adaptive(minimum: 96), spacing: 8)]

    var body: some View {
        LazyVGrid(columns: columns, alignment: .leading, spacing: 8) {
            ForEach(options, id: \.self) { option in
                let isSelected = selection.contains(option)
                Button {
                    if singleSelection {
                        selection = [option]
                    } else if isSelected {
                        selection.removeAll { $0 == option }
                    } else {
                        selection.append(option)
                    }
                } label: {
                    Text(option)
                        .font(.subheadline.weight(.medium))
                        .padding(.horizontal, 14)
                        .padding(.vertical, 8)
                        .frame(maxWidth: .infinity)
                        .background(isSelected ? Color.accentColor : Color(.secondarySystemBackground))
                        .foregroundStyle(isSelected ? .white : .primary)
                        .clipShape(Capsule())
                }
                .buttonStyle(.plain)
            }
        }
    }
}
