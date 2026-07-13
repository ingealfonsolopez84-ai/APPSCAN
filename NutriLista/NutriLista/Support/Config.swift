import Foundation

/// Configuración del proyecto de Supabase.
///
/// Rellena estos valores con los de tu proyecto (Dashboard → Settings → API).
/// La "anon key" es pública por diseño: la seguridad real la aplican las
/// políticas de Row Level Security y la verificación de JWT en el servidor.
enum Config {
    static let supabaseURL = URL(string: "https://TU-PROYECTO.supabase.co")!
    static let supabaseAnonKey = "TU_ANON_KEY"

    static var functionsURL: URL {
        supabaseURL.appendingPathComponent("functions/v1")
    }

    /// Identificadores de producto de la suscripción (App Store Connect).
    static let monthlyProductID = "nutrilista.pro.mensual"
    static let yearlyProductID = "nutrilista.pro.anual"

    static let freeScansPerMonth = 2

    static let privacyPolicyURL = URL(string: "https://tu-dominio.com/privacidad")!
    static let termsURL = URL(string: "https://tu-dominio.com/terminos")!
}
