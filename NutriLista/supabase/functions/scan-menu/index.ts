// NutriLista — Edge Function: escaneo de menú con IA.
//
// Recibe la foto del menú en base64, verifica la identidad del usuario y su
// cuota freemium, la envía a la API de Claude con salida estructurada y
// devuelve el menú como JSON. La imagen NUNCA se persiste.
//
// Secretos requeridos (supabase secrets set):
//   ANTHROPIC_API_KEY  — clave de la API de Anthropic
//   ANTHROPIC_MODEL    — opcional, por defecto "claude-opus-4-8"
//                        (puedes usar "claude-haiku-4-5" para reducir costo)

import { createClient } from "npm:@supabase/supabase-js@2";

const FREE_SCANS_PER_MONTH = 2;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // ~8 MB ya en base64

const MENU_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["is_menu", "title", "days"],
  properties: {
    is_menu: { type: "boolean" },
    title: { type: "string" },
    days: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["day_of_week", "meals"],
        properties: {
          day_of_week: { type: "integer" }, // 1 = lunes … 7 = domingo
          meals: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["slot", "name", "ingredients", "kcal", "protein_g", "carbs_g", "fat_g"],
              properties: {
                slot: {
                  type: "string",
                  enum: ["desayuno", "colacion_1", "comida", "colacion_2", "cena"],
                },
                name: { type: "string" },
                ingredients: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["name", "quantity", "unit", "category"],
                    properties: {
                      name: { type: "string" },
                      quantity: { type: "number" },
                      unit: { type: "string" },
                      category: {
                        type: "string",
                        enum: ["frutas_verduras", "proteinas", "lacteos", "abarrotes", "otros"],
                      },
                    },
                  },
                },
                kcal: { type: "integer" },
                protein_g: { type: "number" },
                carbs_g: { type: "number" },
                fat_g: { type: "number" },
              },
            },
          },
        },
      },
    },
  },
} as const;

const PROMPT = `Analiza la imagen: es la foto de un plan de alimentación semanal
entregado por un nutriólogo (puede ser impreso o manuscrito, en español).

Extrae TODAS las comidas que aparezcan, organizadas por día de la semana
(day_of_week: 1 = lunes … 7 = domingo). Para cada comida:
- slot: desayuno, colacion_1, comida, colacion_2 o cena.
- name: nombre corto del platillo.
- ingredients: cada ingrediente con cantidad numérica, unidad (g, ml, pieza,
  taza, cucharada, lata, rebanada…) y categoría de supermercado.
- Estima el contenido nutricional (kcal, proteína, carbohidratos y grasa en
  gramos) usando valores estándar de tablas nutricionales para las porciones
  indicadas.

Si el menú no especifica días, distribúyelo como un día tipo (day_of_week: 1).
Si la imagen NO es un plan de alimentación, devuelve is_menu: false y days: [].
No inventes comidas que no estén en la imagen.`;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  const authHeader = req.headers.get("Authorization") ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

  // Cliente con el token del usuario: identifica quién llama.
  const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData?.user) return json(401, { error: "unauthorized" });
  const userId = userData.user.id;

  // Cliente administrador: cuota y registro de escaneos (RLS no aplica).
  const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // --- Cuota freemium ---
  const { data: profile } = await admin
    .from("profiles").select("is_pro").eq("id", userId).single();

  if (!profile?.is_pro) {
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const { count } = await admin
      .from("scans")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", monthStart.toISOString());
    if ((count ?? 0) >= FREE_SCANS_PER_MONTH) {
      return json(402, { error: "quota_exceeded", limit: FREE_SCANS_PER_MONTH });
    }
  }

  // --- Imagen ---
  let body: { image_base64?: string; media_type?: string };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "invalid_body" });
  }
  const imageBase64 = body.image_base64 ?? "";
  const mediaType = body.media_type ?? "image/jpeg";
  if (!imageBase64 || imageBase64.length > MAX_IMAGE_BYTES * 1.4) {
    return json(400, { error: "invalid_image" });
  }
  if (!["image/jpeg", "image/png", "image/heic", "image/webp"].includes(mediaType)) {
    return json(400, { error: "unsupported_media_type" });
  }

  // --- Llamada a la API de Claude con salida estructurada ---
  const model = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-opus-4-8";
  const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 16000,
      output_config: { format: { type: "json_schema", schema: MENU_SCHEMA } },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: imageBase64 },
            },
            { type: "text", text: PROMPT },
          ],
        },
      ],
    }),
  });

  if (!anthropicResponse.ok) {
    const detail = await anthropicResponse.text();
    console.error("anthropic_error", anthropicResponse.status, detail.slice(0, 500));
    return json(502, { error: "ai_unavailable" });
  }

  const message = await anthropicResponse.json();
  if (message.stop_reason === "refusal") {
    return json(422, { error: "ai_refused" });
  }
  const textBlock = (message.content ?? []).find((b: { type: string }) => b.type === "text");
  if (!textBlock?.text) return json(502, { error: "ai_empty" });

  let menu: { is_menu: boolean };
  try {
    menu = JSON.parse(textBlock.text);
  } catch {
    return json(502, { error: "ai_invalid_json" });
  }

  // Registrar el escaneo para la cuota (solo si fue un menú real).
  if (menu.is_menu) {
    await admin.from("scans").insert({ user_id: userId });
  }

  return json(200, { menu });
});
