import Foundation

/// Cliente ligero de Supabase: autenticación (GoTrue), base de datos (PostgREST)
/// y Edge Functions, sin dependencias externas.
///
/// Toda petición a la base de datos viaja con el JWT del usuario, de modo que
/// las políticas de Row Level Security del servidor deciden qué filas puede
/// ver o modificar — la app nunca es la última línea de defensa.
actor SupabaseClient {
    static let shared = SupabaseClient()

    struct Session: Codable {
        var accessToken: String
        var refreshToken: String
        var expiresAt: Date
        var userID: UUID

        enum CodingKeys: String, CodingKey {
            case accessToken = "access_token"
            case refreshToken = "refresh_token"
            case expiresAt = "expires_at"
            case userID = "user_id"
        }
    }

    enum SupaError: LocalizedError {
        case notAuthenticated
        case http(Int, String)
        case quotaExceeded

        var errorDescription: String? {
            switch self {
            case .notAuthenticated:
                return "Tu sesión expiró. Inicia sesión de nuevo."
            case .http(let code, let message):
                return "Error del servidor (\(code)): \(message)"
            case .quotaExceeded:
                return "Alcanzaste tus escaneos gratis de este mes."
            }
        }
    }

    private var session: Session?
    private let sessionKey = "supabase.session"
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder

    private init() {
        decoder = JSONDecoder()
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let plain = ISO8601DateFormatter()
        decoder.dateDecodingStrategy = .custom { d in
            let container = try d.singleValueContainer()
            let string = try container.decode(String.self)
            if let date = formatter.date(from: string) ?? plain.date(from: string) {
                return date
            }
            throw DecodingError.dataCorruptedError(in: container, debugDescription: "Fecha inválida: \(string)")
        }
        encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601

        if let data = KeychainStore.load(key: sessionKey),
           let stored = try? JSONDecoder().decode(Session.self, from: data) {
            session = stored
        }
    }

    // MARK: - Sesión

    var currentUserID: UUID? { session?.userID }
    var isSignedIn: Bool { session != nil }

    private func persist(_ newSession: Session?) {
        session = newSession
        if let newSession, let data = try? JSONEncoder().encode(newSession) {
            KeychainStore.save(data, key: sessionKey)
        } else {
            KeychainStore.delete(key: sessionKey)
        }
    }

    /// Inicio de sesión con Apple: intercambia el identity token por una sesión.
    func signInWithApple(idToken: String, nonce: String) async throws -> UUID {
        var request = URLRequest(url: Config.supabaseURL
            .appendingPathComponent("auth/v1/token"))
        request.url = request.url?.appending(queryItems: [.init(name: "grant_type", value: "id_token")])
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(Config.supabaseAnonKey, forHTTPHeaderField: "apikey")
        request.httpBody = try JSONSerialization.data(withJSONObject: [
            "provider": "apple",
            "id_token": idToken,
            "nonce": nonce,
        ])
        let session = try await performAuthRequest(request)
        persist(session)
        return session.userID
    }

    func signOut() {
        persist(nil)
    }

    /// Devuelve un token válido, renovándolo si está por expirar.
    private func validAccessToken() async throws -> String {
        guard let current = session else { throw SupaError.notAuthenticated }
        if current.expiresAt.timeIntervalSinceNow > 60 {
            return current.accessToken
        }
        var request = URLRequest(url: Config.supabaseURL
            .appendingPathComponent("auth/v1/token")
            .appending(queryItems: [.init(name: "grant_type", value: "refresh_token")]))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(Config.supabaseAnonKey, forHTTPHeaderField: "apikey")
        request.httpBody = try JSONSerialization.data(withJSONObject: [
            "refresh_token": current.refreshToken,
        ])
        do {
            let refreshed = try await performAuthRequest(request)
            persist(refreshed)
            return refreshed.accessToken
        } catch {
            persist(nil)
            throw SupaError.notAuthenticated
        }
    }

    private func performAuthRequest(_ request: URLRequest) async throws -> Session {
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw SupaError.http(0, "sin respuesta") }
        guard http.statusCode < 300 else {
            throw SupaError.http(http.statusCode, String(data: data, encoding: .utf8) ?? "")
        }
        struct AuthResponse: Decodable {
            let access_token: String
            let refresh_token: String
            let expires_in: Double
            let user: AuthUser
            struct AuthUser: Decodable { let id: UUID }
        }
        let auth = try JSONDecoder().decode(AuthResponse.self, from: data)
        return Session(
            accessToken: auth.access_token,
            refreshToken: auth.refresh_token,
            expiresAt: Date().addingTimeInterval(auth.expires_in),
            userID: auth.user.id
        )
    }

    // MARK: - Base de datos (PostgREST)

    private func restRequest(_ table: String, query: [URLQueryItem]) async throws -> URLRequest {
        var url = Config.supabaseURL.appendingPathComponent("rest/v1/\(table)")
        if !query.isEmpty { url = url.appending(queryItems: query) }
        var request = URLRequest(url: url)
        request.setValue(Config.supabaseAnonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(try await validAccessToken())", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        return request
    }

    private func run(_ request: URLRequest) async throws -> Data {
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw SupaError.http(0, "sin respuesta") }
        guard http.statusCode < 300 else {
            throw SupaError.http(http.statusCode, String(data: data, encoding: .utf8) ?? "")
        }
        return data
    }

    func select<T: Decodable>(_ table: String, query: [URLQueryItem] = []) async throws -> [T] {
        let request = try await restRequest(table, query: query)
        return try decoder.decode([T].self, from: try await run(request))
    }

    func insert<T: Encodable>(_ table: String, values: [T]) async throws {
        var request = try await restRequest(table, query: [])
        request.httpMethod = "POST"
        request.setValue("return=minimal", forHTTPHeaderField: "Prefer")
        request.httpBody = try encoder.encode(values)
        _ = try await run(request)
    }

    func update<T: Encodable>(_ table: String, values: T, query: [URLQueryItem]) async throws {
        var request = try await restRequest(table, query: query)
        request.httpMethod = "PATCH"
        request.setValue("return=minimal", forHTTPHeaderField: "Prefer")
        request.httpBody = try encoder.encode(values)
        _ = try await run(request)
    }

    func delete(_ table: String, query: [URLQueryItem]) async throws {
        var request = try await restRequest(table, query: query)
        request.httpMethod = "DELETE"
        _ = try await run(request)
    }

    // MARK: - Edge Functions

    func invoke(_ functionName: String, body: [String: Any]) async throws -> Data {
        var request = URLRequest(url: Config.functionsURL.appendingPathComponent(functionName))
        request.httpMethod = "POST"
        request.timeoutInterval = 180 // la fotogrametría del menú puede tardar
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(Config.supabaseAnonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(try await validAccessToken())", forHTTPHeaderField: "Authorization")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw SupaError.http(0, "sin respuesta") }
        if http.statusCode == 402 { throw SupaError.quotaExceeded }
        guard http.statusCode < 300 else {
            throw SupaError.http(http.statusCode, String(data: data, encoding: .utf8) ?? "")
        }
        return data
    }
}
