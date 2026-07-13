// NutriLista — Edge Function: verificación de suscripción.
//
// La app envía la transacción firmada de StoreKit 2 (JWS). Aquí se decodifica,
// se valida contra el bundle ID y los productos esperados, y se actualiza el
// estado Pro del usuario en la base de datos. La cuota de escaneos se hace
// cumplir en el servidor a partir de este estado.
//
// Secretos requeridos:
//   APP_BUNDLE_ID — p. ej. "com.tuempresa.nutrilista"
//
// NOTA DE PRODUCCIÓN: antes del lanzamiento, completa la verificación
// criptográfica de la cadena de certificados x5c del JWS contra la CA raíz de
// Apple (Apple Root CA - G3), o migra a App Store Server Notifications V2.
// Documentación: https://developer.apple.com/documentation/appstoreserverapi

import { createClient } from "npm:@supabase/supabase-js@2";

const VALID_PRODUCTS = ["nutrilista.pro.mensual", "nutrilista.pro.anual"];

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function decodeJwsPayload(jws: string): Record<string, unknown> | null {
  const parts = jws.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(new TextDecoder().decode(
      Uint8Array.from(atob(payload), (c) => c.charCodeAt(0)),
    ));
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData?.user) return json(401, { error: "unauthorized" });
  const userId = userData.user.id;

  let body: { signed_transaction?: string };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "invalid_body" });
  }
  if (!body.signed_transaction) return json(400, { error: "missing_transaction" });

  const payload = decodeJwsPayload(body.signed_transaction);
  if (!payload) return json(400, { error: "invalid_jws" });

  const bundleId = payload["bundleId"] as string | undefined;
  const productId = payload["productId"] as string | undefined;
  const expiresDateMs = payload["expiresDate"] as number | undefined;
  const originalTransactionId = String(payload["originalTransactionId"] ?? "");
  const environment = String(payload["environment"] ?? "Production");

  if (bundleId !== Deno.env.get("APP_BUNDLE_ID")) return json(400, { error: "wrong_bundle" });
  if (!productId || !VALID_PRODUCTS.includes(productId)) return json(400, { error: "unknown_product" });
  if (!expiresDateMs) return json(400, { error: "missing_expiry" });

  const expiresAt = new Date(expiresDateMs);
  const isActive = expiresAt.getTime() > Date.now();

  const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  await admin.from("subscriptions").upsert({
    user_id: userId,
    original_transaction_id: originalTransactionId,
    product_id: productId,
    expires_at: expiresAt.toISOString(),
    environment,
    updated_at: new Date().toISOString(),
  });
  await admin.from("profiles").update({ is_pro: isActive }).eq("id", userId);

  return json(200, { is_pro: isActive, expires_at: expiresAt.toISOString() });
});
