import { supabase } from "./supabaseClient";
import type { ApiVaultItem } from "./apiVaultApi";

// ─── Provider registry (UI Only) ─────────────────────────────────────────────

export type CallStyle = "openai-compat" | "anthropic" | "google" | "cohere" | "ollama";

export interface ModelOption {
  label: string;
  value: string;
  tags?: string[];
}

export interface ProviderConfig {
  id: string;
  label: string;
  keywords: string[];
  callStyle: CallStyle;
  baseUrl?: string;
  defaultModel: string;
  models: ModelOption[];
  isDynamic?: boolean;
}

function modelPriority(model: ModelOption): number {
  const text = `${model.label} ${model.value}`.toLowerCase();
  if (text.includes("free") || text.includes(":free")) return 100;
  if (
    text.includes("mini") ||
    text.includes("flash") ||
    text.includes("haiku") ||
    text.includes("small") ||
    text.includes("lite") ||
    text.includes("instant")
  ) {
    return 80;
  }
  if (text.includes("pro") || text.includes("sonnet") || text.includes("turbo")) return 60;
  if (text.includes("opus") || text.includes("ultra") || text.includes("70b") || text.includes("405b")) {
    return 40;
  }
  return 20;
}

export function sortModelsPreferFree(models: ModelOption[]) {
  return [...models].sort((left, right) => {
    const scoreDelta = modelPriority(right) - modelPriority(left);
    if (scoreDelta !== 0) return scoreDelta;
    return left.label.localeCompare(right.label);
  });
}

export const PROVIDER_REGISTRY: ProviderConfig[] = [
  {
    id: "anthropic",
    label: "Anthropic",
    keywords: ["anthropic", "claude"],
    callStyle: "anthropic",
    defaultModel: "claude-3-haiku-20240307",
    models: [
      { label: "Claude 3.5 Sonnet", value: "claude-3-5-sonnet-20241022" },
      { label: "Claude 3.5 Haiku", value: "claude-3-5-haiku-20241022" },
      { label: "Claude 3 Haiku", value: "claude-3-haiku-20240307" },
    ],
  },
  {
    id: "google",
    label: "Google Gemini",
    keywords: ["google", "gemini"],
    callStyle: "google",
    defaultModel: "gemini-1.5-flash",
    models: [
      { label: "Gemini 2.0 Flash", value: "gemini-2.0-flash" },
      { label: "Gemini 1.5 Flash", value: "gemini-1.5-flash" },
      { label: "Gemini 1.5 Pro", value: "gemini-1.5-pro" },
    ],
  },
  {
    id: "groq",
    label: "Groq",
    keywords: ["groq"],
    callStyle: "openai-compat",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.1-8b-instant",
    models: [
      { label: "Llama 3.1 8B Instant", value: "llama-3.1-8b-instant" },
      { label: "Llama 3.3 70B Versatile", value: "llama-3.3-70b-versatile" },
    ],
  },
  {
    id: "openai",
    label: "OpenAI",
    keywords: ["openai", "gpt", "turbo"],
    callStyle: "openai-compat",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    models: [
      { label: "GPT-4o Mini", value: "gpt-4o-mini" },
      { label: "GPT-4o", value: "gpt-4o" },
    ],
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    keywords: ["openrouter"],
    callStyle: "openai-compat",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "openrouter/free",
    models: [
      { label: "OpenRouter Free", value: "openrouter/free" },
    ],
  },
];

const FALLBACK_OPENAI_MODELS = [
  { label: "GPT-4o Mini", value: "gpt-4o-mini" },
  { label: "GPT-4o", value: "gpt-4o" },
  { label: "Llama 3.1 8B Instruct", value: "meta/llama-3.1-8b-instruct" },
];

const NVIDIA_FALLBACK_MODELS = [
  { label: "Llama 3.1 8B Instruct", value: "meta/llama-3.1-8b-instruct" },
  { label: "Llama 3.1 70B Instruct", value: "meta/llama-3.1-70b-instruct" },
  { label: "Llama 3.1 405B Instruct", value: "meta/llama-3.1-405b-instruct" },
  { label: "Llama 3.2 1B Instruct", value: "meta/llama-3.2-1b-instruct" },
  { label: "Llama 3.2 3B Instruct", value: "meta/llama-3.2-3b-instruct" },
  { label: "Llama 3.3 70B Instruct", value: "meta/llama-3.3-70b-instruct" },
  { label: "DeepSeek R1 Distill Llama 8B", value: "deepseek-ai/deepseek-r1-distill-llama-8b" },
  { label: "DeepSeek R1 Distill Qwen 7B", value: "deepseek-ai/deepseek-r1-distill-qwen-7b" },
  { label: "DeepSeek R1 Distill Qwen 14B", value: "deepseek-ai/deepseek-r1-distill-qwen-14b" },
  { label: "DeepSeek R1 Distill Qwen 32B", value: "deepseek-ai/deepseek-r1-distill-qwen-32b" },
  { label: "DeepSeek V3.1", value: "deepseek-ai/deepseek-v3.1" },
  { label: "DeepSeek V3.2", value: "deepseek-ai/deepseek-v3.2" },
  { label: "Gemma 2 2B IT", value: "google/gemma-2-2b-it" },
  { label: "Gemma 2 9B IT", value: "google/gemma-2-9b-it" },
  { label: "Gemma 2 27B IT", value: "google/gemma-2-27b-it" },
  { label: "Gemma 3 1B IT", value: "google/gemma-3-1b-it" },
  { label: "Phi 4 Mini Instruct", value: "microsoft/phi-4-mini-instruct" },
  { label: "Phi 4 Mini Flash Reasoning", value: "microsoft/phi-4-mini-flash-reasoning" },
  { label: "Mistral Small 24B Instruct", value: "mistralai/mistral-small-24b-instruct" },
  { label: "Mistral 2 Large Instruct", value: "mistralai/mistral-2-large-instruct" },
  { label: "Mixtral 8x7B Instruct", value: "mistralai/mixtral-8x7b-instruct" },
  { label: "Kimi K2 Instruct", value: "moonshotai/kimi-k2-instruct" },
  { label: "OpenAI GPT OSS 20B", value: "openai/gpt-oss-20b" },
  { label: "OpenAI GPT OSS 120B", value: "openai/gpt-oss-120b" },
  { label: "Qwen 2 7B Instruct", value: "qwen/qwen2-7b-instruct" },
  { label: "Qwen 2.5 7B Instruct", value: "qwen/qwen2.5-7b-instruct" },
  { label: "Qwen 2.5 Coder 32B Instruct", value: "qwen/qwen2.5-coder-32b-instruct" },
  { label: "Qwen 3 5 122B A10B", value: "qwen/qwen3-5-122b-a10b" },
  { label: "Qwen 3 Coder 480B A35B Instruct", value: "qwen/qwen3-coder-480b-a35b-instruct" },
  { label: "GLM 4.7", value: "z-ai/glm4.7" },
  { label: "GLM 5", value: "z-ai/glm5" },
  { label: "Llama3 ChatQA 1.5 8B", value: "nvidia/llama3-chatqa-1.5-8b" },
  { label: "Llama 3.1 Nemotron Nano 4B", value: "nvidia/llama-3.1-nemotron-nano-4b-v1_1" },
  { label: "Llama 3.1 Nemotron Nano 8B", value: "nvidia/llama-3.1-nemotron-nano-8b-v1" },
  { label: "Llama 3.1 Nemotron Ultra 253B", value: "nvidia/llama-3.1-nemotron-ultra-253b-v1" },
  { label: "Llama 3.3 Nemotron Super 49B", value: "nvidia/llama-3.3-nemotron-super-49b-v1.5" },
  { label: "Nemotron 3 Nano 30B", value: "nvidia/nemotron-3-nano-30b-a3b" },
  { label: "Nemotron 3 Super 120B", value: "nvidia/nemotron-3-super-120b-a12b" },
  { label: "Nemotron Content Safety Reasoning 4B", value: "nvidia/nemotron-content-safety-reasoning-4b" },
  { label: "Nemotron Mini 4B Instruct", value: "nvidia/nemotron-mini-4b-instruct" },
  { label: "NVIDIA Nemotron Nano 9B v2", value: "nvidia/nvidia-nemotron-nano-9b-v2" },
  { label: "USDCode", value: "nvidia/usdcode" },
];

function normalizeProviderId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/https?:\/\//g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "custom-provider";
}

function toLabelCase(value: string) {
  return value
    .trim()
    .split(/[\s\-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function extractConfiguredBaseUrl(item: ApiVaultItem): string | undefined {
  const metadata = [item.provider, item.description ?? "", item.tags ?? ""].join(" ");
  const match =
    metadata.match(/https?:\/\/[^\s,;"]+/i) ||
    metadata.match(/base[_\s-]?url\s*[:=]\s*([^\s,;"]+)/i) ||
    metadata.match(/endpoint\s*[:=]\s*([^\s,;"]+)/i);
  const value = match?.[1] ?? match?.[0];
  return value?.startsWith("http") ? value.replace(/\/+$/, "") : undefined;
}

function inferBaseUrl(providerText: string): string | undefined {
  const provider = providerText.toLowerCase();
  if (provider.includes("openrouter")) return "https://openrouter.ai/api/v1";
  if (provider.includes("groq")) return "https://api.groq.com/openai/v1";
  if (provider.includes("mistral")) return "https://api.mistral.ai/v1";
  if (provider.includes("nvidia")) return "https://integrate.api.nvidia.com/v1";
  if (provider.includes("together")) return "https://api.together.xyz/v1";
  if (provider.includes("perplexity")) return "https://api.perplexity.ai";
  if (provider.includes("fireworks")) return "https://api.fireworks.ai/inference/v1";
  if (provider.includes("deepseek")) return "https://api.deepseek.com/v1";
  if (provider.includes("xai") || provider.includes("grok")) return "https://api.x.ai/v1";
  if (provider.includes("openai")) return "https://api.openai.com/v1";
  return undefined;
}

function buildDynamicProvider(item: ApiVaultItem): ProviderConfig {
  const rawProvider = item.provider.trim() || item.key_name.trim() || "Custom Provider";
  const normalizedId = normalizeProviderId(rawProvider);
  const resolvedBaseUrl = extractConfiguredBaseUrl(item) ?? inferBaseUrl(rawProvider);
  const isNvidia = normalizedId.includes("nvidia");

  return {
    id: normalizedId,
    label: toLabelCase(rawProvider),
    keywords: [normalizedId, rawProvider.toLowerCase()],
    callStyle: "openai-compat",
    baseUrl: resolvedBaseUrl,
    defaultModel: isNvidia ? "meta/llama-3.1-8b-instruct" : "gpt-4o-mini",
    models: isNvidia ? NVIDIA_FALLBACK_MODELS : FALLBACK_OPENAI_MODELS,
    isDynamic: true,
  };
}

export function detectProvider(item: ApiVaultItem): ProviderConfig {
  const haystack = [item.key_name, item.provider, item.description ?? "", item.tags ?? ""].join(" ").toLowerCase();
  const knownProvider = PROVIDER_REGISTRY.find((config) =>
    config.keywords.some((keyword) => haystack.includes(keyword)),
  );
  return knownProvider ?? buildDynamicProvider(item);
}

export function isAiProvider(item: ApiVaultItem): boolean {
  return Boolean(item.provider.trim() || item.key_name.trim());
}

export function getDefaultModel(familyOrId: string): string {
  const provider = PROVIDER_REGISTRY.find((c) => c.id === familyOrId);
  return sortModelsPreferFree(provider?.models ?? [])[0]?.value ?? provider?.defaultModel ?? "gpt-4o-mini";
}

export function getModelOptions(familyOrId: string): ModelOption[] {
  const provider = PROVIDER_REGISTRY.find((c) => c.id === familyOrId);
  return withModelTags(sortModelsPreferFree(provider?.models ?? FALLBACK_OPENAI_MODELS));
}

export function inferModelTags(model: Pick<ModelOption, "label" | "value">): string[] {
  const haystack = `${model.label} ${model.value}`.toLowerCase();
  const tags: string[] = [];

  if (
    haystack.includes("image") ||
    haystack.includes("vision") ||
    haystack.includes("vl") ||
    haystack.includes("dall-e") ||
    haystack.includes("gpt-image")
  ) {
    tags.push("IMG");
  }

  if (haystack.includes("video") || haystack.includes("veo") || haystack.includes("sora")) {
    tags.push("VIDEO");
  }

  if (
    haystack.includes("coder") ||
    haystack.includes("code") ||
    haystack.includes("dev") ||
    haystack.includes("program")
  ) {
    tags.push("CODE");
  }

  if (
    haystack.includes("reason") ||
    haystack.includes("r1") ||
    haystack.includes("thinking") ||
    haystack.includes("analysis")
  ) {
    tags.push("REASON");
  }

  if (haystack.includes("safety") || haystack.includes("guard")) {
    tags.push("SAFE");
  }

  if (
    haystack.includes("mini") ||
    haystack.includes("nano") ||
    haystack.includes("flash") ||
    haystack.includes("haiku") ||
    haystack.includes("small") ||
    haystack.includes("instant") ||
    haystack.includes("lite")
  ) {
    tags.push("FAST");
  }

  if (
    haystack.includes("70b") ||
    haystack.includes("120b") ||
    haystack.includes("122b") ||
    haystack.includes("253b") ||
    haystack.includes("405b") ||
    haystack.includes("480b") ||
    haystack.includes("ultra") ||
    haystack.includes("large") ||
    haystack.includes("opus")
  ) {
    tags.push("HEAVY");
  }

  if (haystack.includes("free") || haystack.includes(":free")) {
    tags.push("FREE");
  }

  if (tags.length === 0) {
    tags.push("CHAT");
  } else if (!tags.includes("IMG") && !tags.includes("VIDEO") && !tags.includes("SAFE")) {
    tags.unshift("CHAT");
  }

  return tags.slice(0, 3);
}

export function withModelTags(models: ModelOption[]): ModelOption[] {
  return models.map((model) => ({
    ...model,
    tags: model.tags && model.tags.length > 0 ? model.tags : inferModelTags(model),
  }));
}

export function formatModelOptionLabel(model: Pick<ModelOption, "label" | "tags">): string {
  const tags = model.tags?.length ? ` [${model.tags.join("] [")}]` : "";
  return `${model.label}${tags}`;
}

// ─── Chat implementation ─────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

type PlaygroundMode = "chat" | "image" | "video";

interface SendMessageOptions {
  apiItem: ApiVaultItem;
  model: string;
  messages: ChatMessage[];
  systemPrompt?: string;
  baseUrl?: string;
  mode?: PlaygroundMode;
}

async function invokeAiProxy(body: Record<string, unknown>) {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) throw new Error(sessionError.message);
  if (!session?.access_token) throw new Error("Not authenticated.");

  const { data, error } = await supabase.functions.invoke("ai-proxy", {
    headers: {
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: {
      ...body,
      userJwt: session.access_token,
    },
  });

  if (error) {
    const message = (error as any)?.context?.json?.error || (error as any)?.message || "Request failed.";
    throw new Error(message);
  }

  return data;
}

export async function sendChatMessage(opts: SendMessageOptions): Promise<string> {
  const { apiItem, model, messages, systemPrompt, baseUrl, mode = "chat" } = opts;
  const provider = detectProvider(apiItem);

  const action =
    mode === "image" ? "generate-image" : mode === "video" ? "generate-video" : "chat";

  const payload: Record<string, unknown> = {
    action,
    keyId: apiItem.id,
    provider: provider.id,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    model,
    systemPrompt,
    baseUrl: baseUrl || provider.baseUrl,
  };

  if (mode === "image") {
    payload.prompt = messages.map((message) => message.content).join("\n");
  }
  if (mode === "video") {
    payload.prompt = messages.map((message) => message.content).join("\n");
  }

  const data = await invokeAiProxy(payload);

  if (data?.error) {
    throw new Error(data.error || "Provider error.");
  }

  return data?.data || data?.url || data?.content || "(No response)";
}

export async function fetchOpenRouterModels(): Promise<ModelOption[]> {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/models");
    if (!res.ok) throw new Error("Failed");
    const json = await res.json();
    return withModelTags(json.data
      .filter((m: any) => m.id.includes(":free"))
      .map((m: any) => ({ label: m.name ?? m.id, value: m.id })));
  } catch {
    return withModelTags([{ label: "OpenRouter Free", value: "openrouter/free" }]);
  }
}

export async function fetchNvidiaModels(): Promise<ModelOption[]> {
  try {
    const res = await fetch("https://docs.api.nvidia.com/nim/reference/llm-apis");
    if (!res.ok) throw new Error("Failed");

    const html = await res.text();
    const matches = [...html.matchAll(/([a-z0-9_.-]+)\s*\/\s*([a-z0-9_.-]+(?:-[a-z0-9_.-]+)*)/gi)];
    const seen = new Set<string>();
    const models: { label: string; value: string }[] = [];

    for (const match of matches) {
      const vendor = match[1]?.toLowerCase();
      const model = match[2]?.toLowerCase();
      if (!vendor || !model) continue;

      const value = `${vendor}/${model}`;
      if (seen.has(value)) continue;

      // Keep the Playground focused on chat-capable models rather than embeddings/rerank/search endpoints.
      const excludedTerms = ["embed", "rerank", "reward", "guard", "safety", "jailbreak", "search", "pii"];
      if (excludedTerms.some((term) => value.includes(term))) continue;

      seen.add(value);
      models.push({
        label: value
          .split("/")
          .map((part) =>
            part
              .split(/[-_.]/)
              .filter(Boolean)
              .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
              .join(" "),
          )
          .join(" / "),
        value,
      });
    }

    return withModelTags(sortModelsPreferFree(models.length > 0 ? models : NVIDIA_FALLBACK_MODELS));
  } catch {
    return withModelTags(sortModelsPreferFree(NVIDIA_FALLBACK_MODELS));
  }
}
