import SwiftUI

struct MainTabView: View {
    var body: some View {
        TabView {
            TodayView()
                .tabItem { Label("Hoy", systemImage: "house.fill") }
            ShoppingListView()
                .tabItem { Label("Lista", systemImage: "checklist") }
            RecipesView()
                .tabItem { Label("Recetas", systemImage: "book.closed.fill") }
            ProfileView()
                .tabItem { Label("Perfil", systemImage: "person.crop.circle") }
        }
    }
}
