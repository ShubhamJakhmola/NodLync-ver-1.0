import type { ApiVaultItem } from "./apiVaultApi";

export type PlaygroundMode = "chat" | "image" | "video";

export type UniversalContentType =
  | "text"
  | "markdown"
  | "code"
  | "reasoning"
  | "image"
  | "video"
  | "audio"
  | "file"
  | "json"
  | "unknown";

export interface UniversalContentPart {
  type: UniversalContentType;
  text?: string;
  url?: string;
  mimeType?: string;
  language?: string;
  data?: string;
  metadata?: Record<string, unknown>;
}

export interface UniversalError {
  kind: "frontend" | "backend" | "provider" | "validation" | "unsupported";
  message: string;
  code?: string;
  provider?: string;
  raw?: unknown;
  debug?: Record<string, unknown>;
}

export interface UniversalResponse {
  ok: boolean;
  provider: string;
  model?: string;
  mode: PlaygroundMode;
  text: string;
  parts: UniversalContentPart[];
  raw: unknown;
  error?: UniversalError;
  debug?: Record<string, unknown>;
}

export interface AdapterChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ProviderConfigLike {
  id: string;
  baseUrl?: string;
}

export interface SendUniversalRequestOptions {
  apiItem: ApiVaultItem;
  provider: ProviderConfigLike;
  model: string;
  mode: PlaygroundMode;
  messages: AdapterChatMessage[];
  baseUrl?: string;
}

export interface ModelOptionLike {
  label: string;
  value: string;
  tags?: string[];
}

type ProxyInvoke = (body: Record<string, unknown>) => Promise<unknown>;
export type { ProxyInvoke };

interface ProviderHttpRequest {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  auth?: { scheme: "bearer" | "header" | "query"; headerName?: string; param?: string };
}

interface AdapterBuildResult {
  body: Record<string, unknown>;
  debug: Record<string, unknown>;
  pollRequest?: ProviderHttpRequest;
}

export type UniversalStreamEvent =
  | { type: "delta"; textDelta: string; raw: unknown }
  | { type: "meta"; raw: unknown }
  | { type: "done"; raw: unknown }
  | { type: "error"; message: string; raw: unknown };

export function buildStreamRequest(opts: SendUniversalRequestOptions) {
  const providerId = opts.provider.id.toLowerCase();
  const baseUrl = opts.baseUrl || opts.provider.baseUrl || "";
  const openAiCompatIds = ["openai", "openrouter", "groq", "xai", "deepseek", "together", "fireworks", "nvidia"];
  const isOpenAiCompat = openAiCompatIds.some((id) => providerId.includes(id));

  if (isOpenAiCompat) {
    return {
      action: "stream",
      keyId: opts.apiItem.id,
      request: {
        url: `${baseUrl}/chat/completions`,
        method: "POST",
        body: {
          model: opts.model,
          messages: opts.messages,
          stream: true,
        },
      },
      debug: { adapter: "openai-compat-stream", endpoint: "/chat/completions", stream: true },
    };
  }

  if (providerId.includes("anthropic")) {
    return {
      action: "stream",
      keyId: opts.apiItem.id,
      request: {
        url: `${baseUrl || "https://api.anthropic.com/v1"}/messages`,
        method: "POST",
        headers: { "anthropic-version": "2023-06-01", "content-type": "application/json" },
        auth: { scheme: "header", headerName: "x-api-key" },
        body: {
          model: opts.model,
          max_tokens: 1024,
          stream: true,
          messages: opts.messages.filter((m) => m.role !== "system").map((m) => ({ role: m.role, content: m.content })),
        },
      },
      debug: { adapter: "anthropic-stream", endpoint: "/messages", stream: true },
    };
  }

  if (providerId.includes("google") || providerId.includes("gemini")) {
    // Gemini streaming endpoint (where supported).
    return {
      action: "stream",
      keyId: opts.apiItem.id,
      request: {
        url: `${baseUrl || "https://generativelanguage.googleapis.com/v1beta"}/models/${opts.model}:streamGenerateContent`,
        method: "POST",
        auth: { scheme: "query", param: "key" },
        body: {
          contents: opts.messages
            .filter((m) => m.role !== "system")
            .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
        },
      },
      debug: { adapter: "gemini-streamGenerateContent", endpoint: ":streamGenerateContent", stream: true },
    };
  }

  return null;
}

function inferCapabilities(model: string, mode: PlaygroundMode) {
  const key = model.toLowerCase();
  const image = key.includes("image") || key.includes("vision") || key.includes("vl") || key.includes("dall");
  const video = key.includes("video") || key.includes("veo") || key.includes("sora");
  const audio = key.includes("audio") || key.includes("speech") || key.includes("tts");
  return {
    image: mode === "image" || image,
    video: mode === "video" || video,
    audio,
    text: mode === "chat",
  };
}

function uniqueTextPrompt(messages: AdapterChatMessage[]) {
  return messages.map((m) => m.content.trim()).filter(Boolean).join("\n");
}

function buildAdapterRequest(opts: SendUniversalRequestOptions): AdapterBuildResult {
  const providerId = opts.provider.id.toLowerCase();
  const capabilities = inferCapabilities(opts.model, opts.mode);
  const prompt = uniqueTextPrompt(opts.messages);
  const baseUrl = opts.baseUrl || opts.provider.baseUrl || "";
  const openAiCompatIds = ["openai", "openrouter", "groq", "xai", "deepseek", "together", "fireworks"];
  const isOpenAiCompat = openAiCompatIds.some((id) => providerId.includes(id));

  if (opts.mode === "video" && !capabilities.video && !providerId.includes("replicate") && !providerId.includes("fal")) {
    throw Object.assign(new Error("Selected model/provider does not advertise video capability."), {
      universalError: {
        kind: "unsupported",
        message: "Selected model/provider does not advertise video capability.",
        provider: opts.provider.id,
        debug: { mode: opts.mode, model: opts.model },
      } satisfies UniversalError,
    });
  }

  if (isOpenAiCompat) {
    if (opts.mode === "image") {
      return {
        body: {
          action: "http",
          keyId: opts.apiItem.id,
          request: {
            url: `${baseUrl}/images/generations`,
            method: "POST",
            body: { model: opts.model, prompt, n: 1, size: "1024x1024" },
          },
        },
        debug: { adapter: "openai-compat-image", endpoint: "/images/generations" },
      };
    }
    return {
      body: {
        action: "chat",
        keyId: opts.apiItem.id,
        provider: opts.provider.id,
        baseUrl,
        model: opts.model,
        messages: opts.messages,
      },
      debug: { adapter: "openai-compat-chat", endpoint: "/chat/completions" },
    };
  }

  if (providerId.includes("anthropic")) {
    return {
      body: {
        action: "http",
        keyId: opts.apiItem.id,
        request: {
          url: `${baseUrl || "https://api.anthropic.com/v1"}/messages`,
          method: "POST",
          headers: { "anthropic-version": "2023-06-01", "content-type": "application/json" },
          auth: { scheme: "header", headerName: "x-api-key" },
          body: {
            model: opts.model,
            max_tokens: 1024,
            messages: opts.messages.filter((m) => m.role !== "system").map((m) => ({ role: m.role, content: m.content })),
          },
        },
      },
      debug: { adapter: "anthropic-messages", endpoint: "/messages" },
    };
  }

  if (providerId.includes("google") || providerId.includes("gemini")) {
    return {
      body: {
        action: "http",
        keyId: opts.apiItem.id,
        request: {
          url: `${baseUrl || "https://generativelanguage.googleapis.com/v1beta"}/models/${opts.model}:generateContent`,
          method: "POST",
          auth: { scheme: "query", param: "key" },
          body: {
            contents: opts.messages
              .filter((m) => m.role !== "system")
              .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
          },
        },
      },
      debug: { adapter: "gemini-generateContent", endpoint: ":generateContent" },
    };
  }

  if (providerId.includes("stability")) {
    return {
      body: {
        action: "http",
        keyId: opts.apiItem.id,
        request: {
          url: `${baseUrl || "https://api.stability.ai"}/v2beta/stable-image/generate/core`,
          method: "POST",
          headers: { Accept: "application/json" },
          auth: { scheme: "header", headerName: "Authorization" },
          body: { prompt, output_format: "png" },
        },
      },
      debug: { adapter: "stability-image", endpoint: "/v2beta/stable-image/generate/core" },
    };
  }

  if (providerId.includes("replicate")) {
    return {
      body: {
        action: "http",
        keyId: opts.apiItem.id,
        request: {
          url: `${baseUrl || "https://api.replicate.com/v1"}/predictions`,
          method: "POST",
          body: { version: opts.model, input: { prompt } },
        },
      },
      debug: { adapter: "replicate-predictions", endpoint: "/predictions" },
      pollRequest: {
        url: `${baseUrl || "https://api.replicate.com/v1"}/predictions`,
        method: "GET",
      },
    };
  }

  if (providerId.includes("fal")) {
    return {
      body: {
        action: "http",
        keyId: opts.apiItem.id,
        request: {
          url: `${baseUrl || "https://fal.run"}/${opts.model}`,
          method: "POST",
          body: { prompt },
        },
      },
      debug: { adapter: "fal-generate", endpoint: `/${opts.model}` },
    };
  }

  return {
    body: {
      action: "chat",
      keyId: opts.apiItem.id,
      provider: opts.provider.id,
      baseUrl,
      model: opts.model,
      messages: opts.messages,
    },
    debug: { adapter: "fallback-chat", endpoint: "/chat/completions" },
  };
}

function partFromMaybeUrl(value: string): UniversalContentPart {
  const trimmed = value.trim();
  if (/^data:image\//i.test(trimmed) || /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(trimmed)) return { type: "image", url: trimmed };
  if (/^data:audio\//i.test(trimmed) || /\.(mp3|wav|ogg|m4a)(\?|$)/i.test(trimmed)) return { type: "audio", url: trimmed };
  if (/^data:video\//i.test(trimmed) || /\.(mp4|webm|mov|mkv)(\?|$)/i.test(trimmed)) return { type: "video", url: trimmed };
  if (/^https?:\/\//i.test(trimmed)) return { type: "file", url: trimmed };
  return { type: "text", text: value };
}

function pushUniquePart(parts: UniversalContentPart[], next: UniversalContentPart) {
  if (next.url && parts.some((part) => part.type === next.type && part.url === next.url)) return;
  if (next.text && parts.some((part) => part.type === next.type && part.text === next.text)) return;
  parts.push(next);
}

function collectFromUnknown(input: unknown, parts: UniversalContentPart[]) {
  if (input == null) return;
  if (typeof input === "string") return pushUniquePart(parts, partFromMaybeUrl(input));
  if (Array.isArray(input)) return input.forEach((item) => collectFromUnknown(item, parts));
  if (typeof input !== "object") return;

  const node = input as Record<string, unknown>;
  if (typeof node.text === "string") pushUniquePart(parts, partFromMaybeUrl(node.text));
  if (typeof node.content === "string") pushUniquePart(parts, partFromMaybeUrl(node.content));
  if (typeof node.output_text === "string") pushUniquePart(parts, partFromMaybeUrl(node.output_text));
  if (typeof node.reasoning === "string") pushUniquePart(parts, { type: "reasoning", text: node.reasoning });
  if (typeof node.url === "string") pushUniquePart(parts, partFromMaybeUrl(node.url));
  if (typeof node.image_url === "string") pushUniquePart(parts, { type: "image", url: node.image_url });
  if (typeof node.video_url === "string") pushUniquePart(parts, { type: "video", url: node.video_url });
  if (typeof node.audio_url === "string") pushUniquePart(parts, { type: "audio", url: node.audio_url });
  if (typeof node.b64_json === "string") pushUniquePart(parts, { type: "image", data: node.b64_json, mimeType: "image/png" });
  if (typeof node.code === "string") pushUniquePart(parts, { type: "code", text: node.code });

  ["data", "result", "response", "output", "outputs", "content", "message", "messages", "choices", "parts", "items", "candidates", "body"].forEach(
    (key) => collectFromUnknown(node[key], parts),
  );
}

function detectJobPollUrl(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const node = raw as Record<string, unknown>;
  const status = typeof node.status === "string" ? node.status.toLowerCase() : "";
  if (status && ["queued", "starting", "processing", "in_progress"].includes(status)) {
    const urls =
      node.urls && typeof node.urls === "object" ? (node.urls as Record<string, unknown>) : undefined;
    const poll = node.poll_url ?? node.polling_url ?? urls?.get;
    if (typeof poll === "string") return poll;
  }
  return null;
}

async function pollUntilDone(
  invoke: ProxyInvoke,
  keyId: string,
  pollUrl: string,
  maxAttempts = 20,
): Promise<unknown> {
  let last: unknown = null;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const res = await invoke({
      action: "http",
      keyId,
      request: { url: pollUrl, method: "GET" },
    });
    last = res;
    const nested = (res as { data?: { body?: unknown } })?.data?.body;
    const nextPoll = detectJobPollUrl(nested ?? res);
    if (!nextPoll) return res;
  }
  return last;
}

function normalizeUniversalResponse(data: unknown, providerId: string, mode: PlaygroundMode, model: string): UniversalResponse {
  const parts: UniversalContentPart[] = [];
  collectFromUnknown(data, parts);
  if (!parts.length) pushUniquePart(parts, { type: "unknown", text: JSON.stringify(data ?? {}) });
  const text = parts.map((part) => part.text ?? part.url ?? "").filter(Boolean).join("\n").trim();
  return {
    ok: true,
    provider: providerId,
    mode,
    model,
    text: text || "(No response)",
    parts,
    raw: data,
  };
}

export async function executeUniversalRequest(opts: SendUniversalRequestOptions, invoke: ProxyInvoke): Promise<UniversalResponse> {
  const built = buildAdapterRequest(opts);
  let raw = await invoke(built.body);
  const nestedBody = (raw as { data?: { body?: unknown } })?.data?.body;
  const pollUrl = detectJobPollUrl(nestedBody ?? raw);
  if (pollUrl) {
    raw = await pollUntilDone(invoke, opts.apiItem.id, pollUrl);
  }
  const normalized = normalizeUniversalResponse(raw, opts.provider.id, opts.mode, opts.model);
  normalized.debug = {
    ...built.debug,
    mode: opts.mode,
    provider: opts.provider.id,
    model: opts.model,
    usedBaseUrl: opts.baseUrl || opts.provider.baseUrl,
    didPoll: Boolean(pollUrl),
  };
  return normalized;
}

export function dedupeModelOptions(models: ModelOptionLike[], providerId?: string): ModelOptionLike[] {
  const deduped = new Map<string, ModelOptionLike>();
  const pid = providerId || "provider";
  for (const model of models) {
    const value = String(model.value || "").trim();
    if (!value) continue;
    const stableId = `${pid}::${value.toLowerCase()}`;
    if (!deduped.has(stableId)) deduped.set(stableId, model);
  }
  return Array.from(deduped.values());
}
