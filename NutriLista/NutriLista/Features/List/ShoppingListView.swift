import SwiftUI

/// Modo súper: lista agrupada por categoría, con despensa, estimado y
/// comparador de precios entre súpers (Pro).
struct ShoppingListView: View {
    @EnvironmentObject private var state: AppState
    @State private var showPantry = false
    @State private var showComparison = false
    @State private var showPaywall = false

    private var grouped: [(category: String, label: String, items: [ShoppingItem])] {
        let order = ["frutas_verduras", "proteinas", "lacteos", "abarrotes", "otros"]
        return order.compactMap { category in
            let items = state.shoppingItems.filter { $0.category == category }
            guard !items.isEmpty else { return nil }
            return (category, items[0].categoryLabel, items)
        }
    }

    private var checkedCount: Int { state.shoppingItems.filter(\.checked).count }

    var body: some View {
        NavigationStack {
            Group {
                if state.shoppingItems.isEmpty {
                    ContentUnavailableView(
                        "Tu lista está vacía",
                        systemImage: "checklist",
                        description: Text("Escanea un menú en la pestaña Hoy y aquí aparecerá todo lo que necesitas comprar.")
                    )
                } else {
                    list
                }
            }
            .navigationTitle("Lista de compras")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        showPantry = true
                    } label: {
                        Label("Despensa", systemImage: "cabinet")
                    }
                }
            }
            .sheet(isPresented: $showPantry) { PantrySheet() }
            .sheet(isPresented: $showComparison) { StoreComparisonSheet() }
            .sheet(isPresented: $showPaywall) { PaywallView() }
        }
    }

    private var list: some View {
        List {
            Section {
                budgetHeader
            }

            ForEach(grouped, id: \.category) { group in
                Section(group.label) {
                    ForEach(group.items) { item in
                        ShoppingRow(item: item)
                    }
                }
            }

            if !state.pantry.isEmpty {
                Section("Ya en tu despensa (no se compran)") {
                    Text(state.pantry.map(\.name).joined(separator: ", "))
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
        }
    }

    private var budgetHeader: some View {
        let store = state.profile?.favoriteStore ?? "Walmart"
        let estimate = state.budget(for: store)
        return VStack(alignment: .leading, spacing: 10) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("\(checkedCount) de \(state.shoppingItems.count) artículos")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    if estimate.matchedItems > 0 {
                        Text("$\(Int(estimate.low))–$\(Int(estimate.high)) MXN en \(store)")
                            .font(.headline)
                            .monospacedDigit()
                    } else {
                        Text("Sin precios de referencia aún").font(.headline)
                    }
                }
                Spacer()
            }
            Button {
                if state.isPro {
                    showComparison = true
                } else {
                    showPaywall = true
                }
            } label: {
                HStack {
                    Label("¿Dónde conviene surtir?", systemImage: "chart.bar.fill")
                        .font(.subheadline.weight(.semibold))
                    Spacer()
                    if !state.isPro {
                        Text("PRO")
                            .font(.caption2.bold())
                            .padding(.horizontal, 8)
                            .padding(.vertical, 3)
                            .background(Color.orange.opacity(0.15))
                            .foregroundStyle(.orange)
                            .clipShape(Capsule())
                    }
                    Image(systemName: "chevron.right").font(.caption)
                }
            }
            .buttonStyle(.plain)
        }
        .padding(.vertical, 4)
    }
}

struct ShoppingRow: View {
    @EnvironmentObject private var state: AppState
    let item: ShoppingItem

    var body: some View {
        Button {
            Task { await state.toggleShoppingItem(item) }
        } label: {
            HStack(spacing: 12) {
                Image(systemName: item.checked ? "checkmark.circle.fill" : "circle")
                    .font(.title3)
                    .foregroundStyle(item.checked ? Color.accentColor : Color(.systemGray3))
                VStack(alignment: .leading, spacing: 2) {
                    Text(item.name)
                        .strikethrough(item.checked)
                        .foregroundStyle(item.checked ? .secondary : .primary)
                    if !item.quantityText.isEmpty {
                        Text(item.quantityText).font(.caption).foregroundStyle(.secondary)
                    }
                }
                Spacer()
                if let price = item.priceEstimate {
                    Text("$\(Int(price))")
                        .font(.subheadline)
                        .monospacedDigit()
                        .foregroundStyle(.secondary)
                }
            }
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Despensa

struct PantrySheet: View {
    @EnvironmentObject private var state: AppState
    @Environment(\.dismiss) private var dismiss
    @State private var newItem = ""

    var body: some View {
        NavigationStack {
            List {
                Section {
                    HStack {
                        TextField("Ej. avena, aceite de oliva…", text: $newItem)
                            .onSubmit(add)
                        Button("Agregar", action: add)
                            .disabled(newItem.trimmingCharacters(in: .whitespaces).isEmpty)
                    }
                } header: {
                    Text("¿Qué ya tienes en casa?")
                } footer: {
                    Text("Lo que agregues aquí desaparece de la lista de compras automáticamente.")
                }

                Section {
                    ForEach(state.pantry) { item in
                        Text(item.name)
                    }
                    .onDelete { indexSet in
                        let items = indexSet.map { state.pantry[$0] }
                        Task {
                            for item in items { await state.removePantryItem(item) }
                        }
                    }
                }
            }
            .navigationTitle("Mi despensa")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Listo") { dismiss() }
                }
            }
        }
    }

    private func add() {
        let name = newItem.trimmingCharacters(in: .whitespaces)
        guard !name.isEmpty else { return }
        newItem = ""
        Task { await state.addPantryItem(name) }
    }
}

// MARK: - Comparador de súpers (Pro)

struct StoreComparisonSheet: View {
    @EnvironmentObject private var state: AppState
    @Environment(\.dismiss) private var dismiss

    private let stores = ["Walmart", "Soriana", "Chedraui"]

    var body: some View {
        NavigationStack {
            List {
                Section {
                    let estimates = stores
                        .map { (store: $0, estimate: state.budget(for: $0)) }
                        .sorted { $0.estimate.low < $1.estimate.low }
                    ForEach(Array(estimates.enumerated()), id: \.element.store) { index, entry in
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(entry.store).font(.headline)
                                if index == 0 {
                                    Text("Más conveniente esta semana")
                                        .font(.caption)
                                        .foregroundStyle(Color.accentColor)
                                }
                            }
                            Spacer()
                            Text("$\(Int(entry.estimate.low))–$\(Int(entry.estimate.high))")
                                .font(.subheadline.bold())
                                .monospacedDigit()
                        }
                        .padding(.vertical, 2)
                    }
                } footer: {
                    Text("Estimados en MXN con precios de referencia; los precios reales pueden variar por sucursal y temporada.")
                }
            }
            .navigationTitle("Comparador de súpers")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Listo") { dismiss() }
                }
            }
        }
    }
}
