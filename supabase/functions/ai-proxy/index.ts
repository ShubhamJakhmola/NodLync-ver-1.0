import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ================= CONFIG =================
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-user-jwt",
};

const VAULT_MASTER_SECRET = Deno.env.get("VAULT_MASTER_SECRET");

// ================= PROVIDERS =================
const PROVIDERS: Record<string, { baseUrl: string }> = {
  openai: { baseUrl: "https://api.openai.com/v1" },
  groq: { baseUrl: "https://api.groq.com/openai/v1" },
  mistral: { baseUrl: "https://api.mistral.ai/v1" },
  openrouter: { baseUrl: "https://openrouter.ai/api/v1" },
};

// ================= VAULT SCHEMA =================
type VaultSchema = {
  table: string;
  idCol: string;
  userIdCol: string;
  nameCol: string;
  providerCol: string;
  encryptedCol: string;
  ivCol: string;
  descriptionCol?: string;
  tagsCol?: string;
};

const VAULT_SCHEMA: VaultSchema = {
  table: "api_keys",
  idCol: "id",
  userIdCol: "user_id",
  nameCol: "name",
  providerCol: "provider",
  encryptedCol: "encrypted_key",
  ivCol: "iv",
  descriptionCol: "description",
};

// ================= CRYPTO =================
async function getKey() {
  if (!VAULT_MASTER_SECRET) throw new Error("Missing VAULT_MASTER_SECRET");
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(VAULT_MASTER_SECRET));
  return crypto.subtle.importKey("raw", hash, "AES-GCM", false, ["encrypt", "decrypt"]);
}

function bytesToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function base64ToBytes(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

async function encrypt(plain: string): Promise<{ encrypted: string; iv: string }> {
  const key = await getKey();
  const ivArr = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(plain);
  const encryptedBuf = await crypto.subtle.encrypt({ name: "AES-GCM", iv: ivArr }, key, data);
  return { encrypted: bytesToBase64(new Uint8Array(encryptedBuf)), iv: bytesToBase64(ivArr) };
}

async function decrypt(enc: string, iv: string) {
  const key = await getKey();
  const data = base64ToBytes(enc);
  const ivArr = base64ToBytes(iv);
  const result = await crypto.subtle.decrypt({ name: "AES-GCM", iv: ivArr }, key, data);
  return new TextDecoder().decode(result);
}

// ================= HELPERS =================
function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getUserJwt(req: Request, body?: Record<string, unknown> | null): string | null {
  const bodyJwt = body?.userJwt;
  if (typeof bodyJwt === "string" && bodyJwt.trim()) {
    return bodyJwt.trim();
  }

  const userJwt = req.headers.get("x-user-jwt");
  if (userJwt && userJwt.trim()) {
    return userJwt.trim();
  }

  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim();
  }

  return null;
}

function getProviderConfig(provider: string) {
  const key = provider.toLowerCase();
  return PROVIDERS[key];
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/+$/, "");
}

function inferOpenAiCompatibleBaseUrl(provider: string) {
  const key = provider.toLowerCase();
  if (key.includes("openai")) return "https://api.openai.com/v1";
  if (key.includes("groq")) return "https://api.groq.com/openai/v1";
  if (key.includes("mistral")) return "https://api.mistral.ai/v1";
  if (key.includes("openrouter")) return "https://openrouter.ai/api/v1";
  if (key.includes("nvidia")) return "https://integrate.api.nvidia.com/v1";
  if (key.includes("together")) return "https://api.together.xyz/v1";
  if (key.includes("perplexity")) return "https://api.perplexity.ai";
  if (key.includes("fireworks")) return "https://api.fireworks.ai/inference/v1";
  if (key.includes("deepseek")) return "https://api.deepseek.com/v1";
  if (key.includes("xai") || key.includes("grok")) return "https://api.x.ai/v1";
  return undefined;
}

function resolveBaseUrl(provider: string, requestedBaseUrl?: unknown) {
  if (typeof requestedBaseUrl === "string" && requestedBaseUrl.trim()) {
    return normalizeBaseUrl(requestedBaseUrl);
  }

  const inferred = inferOpenAiCompatibleBaseUrl(provider);
  if (inferred) return inferred;

  const knownProvider = getProviderConfig(provider);
  if (knownProvider?.baseUrl) return knownProvider.baseUrl;

  throw new Error(
    `No base URL configured for provider "${provider}". Save or send a compatible base URL for this provider.`,
  );
}

function estimateCost(model: string, tokens: number) {
  // rough estimation (you can refine later)
  if (model.includes("gpt-4")) return tokens * 0.00001;
  if (model.includes("mixtral")) return tokens * 0.000002;
  return tokens * 0.000005;
}

function canGenerateImages(model: string) {
  const modelKey = model.toLowerCase();
  return modelKey.includes("gpt-image") || modelKey.includes("dall-e") || modelKey.includes("image");
}

// ================= MAIN =================
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const userJwt = getUserJwt(req, body);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: {
            Authorization: userJwt ? `Bearer ${userJwt}` : "",
          },
        },
      },
    );

    // AUTH
    const { data: { user }, error: authError } = await supabase.auth.getUser(userJwt ?? undefined);
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const { action } = body ?? {};
    const vault = VAULT_SCHEMA;

    // ================= API VAULT =================
    if (action === "save-key") {
      const { name, provider, apiKey, description, tags } = body;
      if (!name || !provider || !apiKey) return json({ error: "Invalid payload" }, 400);

      const { encrypted, iv } = await encrypt(String(apiKey));

      const insertRow: Record<string, unknown> = {
        [vault.userIdCol]: user.id,
        [vault.nameCol]: name,
        [vault.providerCol]: provider,
        [vault.encryptedCol]: encrypted,
        [vault.ivCol]: iv,
      };
      if (vault.descriptionCol) insertRow[vault.descriptionCol] = description ?? null;
      if (vault.tagsCol) insertRow[vault.tagsCol] = tags ?? null;

      const { data, error } = await supabase.from(vault.table).insert(insertRow).select("*").single();
      if (error) return json({ error: error.message ?? "Failed to save key" }, 400);
      return json({ data });
    }

    if (action === "reveal-key") {
      const { keyId } = body;
      if (!keyId) return json({ error: "Invalid payload" }, 400);

      const { data: keyRow, error } = await supabase
        .from(vault.table)
        .select("*")
        .eq(vault.idCol, keyId)
        .single();

      if (error || !keyRow) return json({ error: "Key not found" }, 404);

      const enc = (keyRow as any)[vault.encryptedCol];
      const iv = (keyRow as any)[vault.ivCol];
      if (!enc || !iv) return json({ error: "Key is not decryptable" }, 400);

      const apiKey = await decrypt(String(enc), String(iv));
      return json({ data: apiKey });
    }

    if (action === "generate-image") {
      const { prompt, model, size } = body;
      if (!prompt) return json({ error: "Invalid payload" }, 400);

      const { data: keyRow, error } = await supabase
        .from(vault.table)
        .select("*")
        .eq(vault.idCol, body.keyId)
        .single();

      if (error || !keyRow) return json({ error: "Key not found" }, 404);

      const provider = String((body as any).provider || (keyRow as any)[vault.providerCol] || "openai").toLowerCase();
      const baseUrl = resolveBaseUrl(provider, (body as any).baseUrl);
      const apiKey = await decrypt(String((keyRow as any)[vault.encryptedCol]), String((keyRow as any)[vault.ivCol]));
      const requestedModel = String(model || "").trim();

      if (!canGenerateImages(requestedModel)) {
        return json({
          data: `This is a text-only model (${requestedModel || provider}). It can't generate images, so I can help by writing a stronger image prompt instead.`,
          mediaType: "text",
        });
      }

      if (canGenerateImages(requestedModel)) {
        const response = await fetch(`${baseUrl}/images/generations`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: requestedModel || "gpt-image-1",
            prompt,
            size: size || "1024x1024",
          }),
        });

        if (!response.ok) {
          const err = await response.text();
          return json({ error: err }, response.status);
        }

        const result = await response.json();
        const image =
          result.data?.[0]?.url ||
          (result.data?.[0]?.b64_json ? `data:image/png;base64,${result.data[0].b64_json}` : "");
        return json({ data: image, mediaType: "image" });
      }

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model || "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are an image prompt generator. Turn the user request into a vivid, concise, ready-to-use image prompt. Return only the prompt text.",
            },
            { role: "user", content: String(prompt) },
          ],
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        return json({ error: err }, response.status);
      }

      const result = await response.json();
      return json({
        data: result.choices?.[0]?.message?.content || "",
        mediaType: "image-prompt",
      });
    }

    if (action === "generate-video") {
      const { prompt, model } = body;
      if (!prompt) return json({ error: "Invalid payload" }, 400);

      const { data: keyRow, error } = await supabase
        .from(vault.table)
        .select("*")
        .eq(vault.idCol, body.keyId)
        .single();

      if (error || !keyRow) return json({ error: "Key not found" }, 404);

      const provider = String((body as any).provider || (keyRow as any)[vault.providerCol] || "openai").toLowerCase();
      const baseUrl = resolveBaseUrl(provider, (body as any).baseUrl);
      const apiKey = await decrypt(String((keyRow as any)[vault.encryptedCol]), String((keyRow as any)[vault.ivCol]));
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model || "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are a video concept generator. Turn the prompt into a concise storyboard with 5-7 shots, camera notes, and a title. Do not claim you rendered a real video.",
            },
            { role: "user", content: String(prompt) },
          ],
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        return json({ error: err }, response.status);
      }

      const result = await response.json();
      return json({
        data: result.choices?.[0]?.message?.content || "",
        mediaType: "video",
      });
    }

    // ================= CHAT =================
    if (action !== "chat") return json({ error: `Unsupported action: ${action}` }, 400);

    const { keyId, messages, model } = body;
    if (!keyId || !Array.isArray(messages)) return json({ error: "Invalid payload" }, 400);

    const { data: keyRow, error } = await supabase
      .from(vault.table)
      .select("*")
      .eq(vault.idCol, keyId)
      .single();

    if (error || !keyRow) return json({ error: "Key not found" }, 404);

    const apiKey = await decrypt(String((keyRow as any)[vault.encryptedCol]), String((keyRow as any)[vault.ivCol]));
    const provider = String((body as any).provider || (keyRow as any)[vault.providerCol] || "openai");
    const baseUrl = resolveBaseUrl(provider, (body as any).baseUrl);

    // CALL PROVIDER
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || "gpt-4o-mini",
        messages,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("PROVIDER ERROR:", err);
      return json({ error: err }, response.status);
    }

    const result = await response.json();

    const usage = result.usage || {};
    const prompt_tokens = usage.prompt_tokens || 0;
    const completion_tokens = usage.completion_tokens || 0;
    const total_tokens = usage.total_tokens || 0;
    const cost = estimateCost(String(model || "gpt-4o-mini"), total_tokens);

    // STORE USAGE (best-effort)
    try {
      await supabase.from("ai_usage_logs").insert({
        user_id: user.id,
        provider,
        model: model || "gpt-4o-mini",
        prompt_tokens,
        completion_tokens,
        total_tokens,
        cost,
      });
    } catch (e) {
      console.error("USAGE LOG ERROR:", e);
    }

    return json({
      data: result.choices?.[0]?.message?.content || "",
      usage: { prompt_tokens, completion_tokens, total_tokens, cost },
    });
  } catch (err) {
    console.error("FATAL:", err);
    const message = err instanceof Error ? err.message : String(err);
    return json({ error: message || "Internal server error" }, 500);
  }
});
