// NutriLista — Edge Function: eliminación de cuenta (requisito de App Store).
//
// Borra al usuario de auth.users; todas sus filas caen en cascada
// (perfil, menús, comidas, despensa, listas, adherencia, escaneos, suscripción).

import { createClient } from "npm:@supabase/supabase-js@2";

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData?.user) return json(401, { error: "unauthorized" });

  const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { error } = await admin.auth.admin.deleteUser(userData.user.id);
  if (error) {
    console.error("delete_account_error", error.message);
    return json(500, { error: "delete_failed" });
  }
  return json(200, { deleted: true });
});
