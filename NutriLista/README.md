# NutriLista

Del menú de tu nutriólogo a tu carrito del súper: el usuario le toma **una foto al plan de alimentación**, la IA lo convierte en datos y la app genera su **lista de compras**, un **presupuesto semanal estimado** y un **recetario con desglose nutricional**, adaptado a sus hábitos.

## Arquitectura

```
iPhone (SwiftUI, iOS 17+)
 ├── Correo y contraseña ─────────► Supabase Auth (JWT; en pruebas — Apple para producir)
 ├── Datos del usuario ──────────► PostgreSQL con Row Level Security (cifrado AES-256)
 └── Foto del menú ──────────────► Edge Function scan-menu ──► API de Claude
                                    (la imagen se procesa y se DESCARTA — nunca se guarda)
```

| Componente | Tecnología |
|---|---|
| App | SwiftUI, StoreKit 2, PhotosUI |
| Autenticación | Correo y contraseña vía Supabase Auth (modo pruebas; funciona con cuenta gratuita de Apple) |
| Base de datos | PostgreSQL (Supabase) con RLS por usuario |
| IA de visión | API de Claude (`claude-opus-4-8` por defecto; configurable) con salida estructurada JSON |
| Servicio web | Supabase Edge Functions (Deno) |
| Suscripción | StoreKit 2 + verificación server-side |

La app usa un **cliente ligero de Supabase propio** (`Core/SupabaseClient.swift`): sin dependencias externas, sesión en el llavero (Keychain), renovación automática del token.

## Estructura

```
NutriLista/
├── NutriLista.xcodeproj          # Proyecto Xcode 16 (carpetas sincronizadas)
├── NutriLista.storekit           # Config local de StoreKit para probar suscripciones
├── NutriLista/                   # Código de la app
│   ├── Core/                     # SupabaseClient, AppState, PurchaseManager, Models
│   ├── Features/                 # Auth, Onboarding, Hoy, Escaneo, Lista, Recetas, Perfil, Paywall
│   └── Support/                  # Config, Keychain
└── supabase/
    ├── migrations/               # 0001 esquema + RLS · 0002 precios de referencia
    └── functions/
        ├── scan-menu/            # Foto → Claude → menú estructurado (con cuota freemium)
        ├── verify-subscription/  # Valida la transacción de StoreKit 2
        └── delete-account/       # Borrado total de cuenta (requisito de Apple)
```

## Puesta en marcha

### 1. Backend (Supabase) — ~20 minutos

1. Crea un proyecto en [supabase.com](https://supabase.com) (región recomendada: `us-east-1`).
2. En **SQL Editor**, ejecuta `supabase/migrations/0001_init.sql` y luego `0002_seed_prices.sql`.
3. En **Authentication → Providers → Email**: déjalo activado y, para pruebas, **desactiva "Confirm email"** (así el registro entrega la sesión de inmediato sin tener que confirmar por correo).
4. Instala la CLI de Supabase y despliega las funciones:
   ```bash
   supabase link --project-ref TU_PROYECTO
   supabase functions deploy scan-menu verify-subscription delete-account
   ```
5. Configura los secretos:
   ```bash
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...      # console.anthropic.com
   supabase secrets set APP_BUNDLE_ID=com.tuempresa.nutrilista
   # Opcional, para reducir costo por escaneo:
   # supabase secrets set ANTHROPIC_MODEL=claude-haiku-4-5
   ```

### 2. App (Xcode)

1. Abre `NutriLista.xcodeproj` con **Xcode 16+**.
2. En `Support/Config.swift` pega tu **URL de Supabase** y la **anon key** (Dashboard → Settings → API).
3. En **Signing & Capabilities**: selecciona tu equipo. Con una **cuenta gratuita de Apple** funciona, porque el login es por correo/contraseña (no usa Sign in with Apple). Cambia el bundle ID por uno único, p. ej. `com.tunombre.nutrilista`.
4. Para probar la suscripción sin App Store Connect: **Product → Scheme → Edit Scheme → Run → Options → StoreKit Configuration** y elige `NutriLista.storekit`.
5. Ejecuta (⌘R). Crea una cuenta con tu correo y una contraseña de 6+ caracteres. El escaneo funciona en simulador usando "Elegir de mis fotos", o con la cámara en un iPhone real.

> **Nota:** el login por correo es para pruebas. Para publicar, se recomienda volver a **Sign in with Apple** (requisito de Apple cuando ofreces login social) — el método ya está en `SupabaseClient.signInWithApple`; solo hay que reactivar la capacidad y la pantalla de bienvenida anterior.

### 3. App Store Connect (para publicar)

1. Crea la app con tu bundle ID y una **suscripción auto-renovable** con dos planes: `nutrilista.pro.mensual` ($99 MXN) y `nutrilista.pro.anual` ($699 MXN), grupo "NutriLista Pro", con prueba gratis de 7 días.
2. Etiquetas de privacidad: se recopilan *correo (cuenta), datos de salud declarados (dieta/alergias, vinculados al usuario)*; no se usa con fines de rastreo. **Las fotos no se recopilan.**
3. Publica el aviso de privacidad y términos, y pon sus URLs en `Config.swift`.
4. La app ya cumple el requisito de **eliminación de cuenta dentro de la app** (Perfil → Eliminar mi cuenta).

## Seguridad — decisiones ya integradas

- **RLS en todas las tablas**: la base de datos rechaza consultas sobre filas ajenas, aunque hubiera un bug en la app.
- **La clave de la API de IA jamás toca la app**: vive en los secretos de las Edge Functions.
- **Cuota freemium en el servidor**: la tabla `scans` solo la escribe el service role; el cliente no puede falsificarla.
- **Sesión en el Keychain**, tokens JWT con renovación automática, HTTPS/ATS en todo.
- **Minimización**: la foto del menú nunca se persiste; HealthKit no se usa (los datos de salud declarados son solo dieta y alergias, con consentimiento).

## Pendientes antes del lanzamiento (anotados en el código)

1. **`verify-subscription`**: completar la verificación criptográfica de la cadena x5c del JWS contra la CA raíz de Apple, o migrar a App Store Server Notifications V2. Hoy valida estructura, bundle ID, producto y vigencia.
2. Renovaciones/cancelaciones: al expirar, `is_pro` se corrige en el siguiente `verify-subscription`; con Server Notifications sería inmediato.
3. Escalar cantidades por número de personas del hogar (los menús de nutriólogo suelen ser por persona).
4. Ampliar la base de precios de referencia y actualizarla por temporada (tabla `reference_prices`).

## Modelo freemium implementado

| Función | Gratis | Pro |
|---|---|---|
| Escaneos de menú con IA | 2/mes (servidor lo hace cumplir) | Ilimitados |
| Lista de compras + despensa | ✓ | ✓ |
| Presupuesto estimado | 1 súper | Comparador entre súpers |
| Recetario con macros y adherencia | ✓ | ✓ |
