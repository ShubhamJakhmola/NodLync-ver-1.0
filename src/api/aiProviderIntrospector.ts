import { invokeAiProxyStream } from "./aiProxyStream";
import type { ApiVaultItem } from "./apiVaultApi";
import type { MediaCapability } from "../ai/media/types";

export interface ProviderIntrospection {
  baseUrl: string;
  isOpenAiCompatible: boolean;
  supportsStreaming: boolean;
  capabilities: MediaCapability[];
  discoveredModels: string[];
  latencyMs: number;
}

/**
 * AI Provider Introspector
 *
 * Dynamically probes an AI provider to discover its capabilities,
 * models, and compatibility level.
 */
export async function introspectProvider(
  item: ApiVaultItem,
  customBaseUrl?: string
): Promise<ProviderIntrospection> {
  const start = Date.now();
  const providerId = item.provider.toLowerCase();
  
  // 1. Resolve starting Base URL
  let baseUrl = customBaseUrl || "";
  if (!baseUrl) {
    // Try to infer from known patterns
    if (providerId.includes("openai")) baseUrl = "https://api.openai.com/v1";
    else if (providerId.includes("groq")) baseUrl = "https://api.groq.com/openai/v1";
    else if (providerId.includes("openrouter")) baseUrl = "https://openrouter.ai/api/v1";
    else if (providerId.includes("mistral")) baseUrl = "https://api.mistral.ai/v1";
    else if (providerId.includes("together")) baseUrl = "https://api.together.xyz/v1";
    else if (providerId.includes("deepseek")) baseUrl = "https://api.deepseek.com/v1";
    else if (providerId.includes("xai")) baseUrl = "https://api.x.ai/v1";
  }

  const result: ProviderIntrospection = {
    baseUrl,
    isOpenAiCompatible: false,
    supportsStreaming: true, // Default to true for modern providers
    capabilities: [],
    discoveredModels: [],
    latencyMs: 0,
  };

  if (!baseUrl) return result;

  try {
    // 2. Probe Models Endpoint
    const res = await invokeAiProxyStream({
      action: "http",
      keyId: item.id,
      request: {
        url: `${baseUrl}/models`,
        method: "GET",
        auth: { scheme: "bearer" },
      },
    } as any);

    if (res.ok) {
      const data: any = await res.json();
      result.isOpenAiCompatible = Array.isArray(data?.data);
      
      if (result.isOpenAiCompatible) {
        result.discoveredModels = data.data.map((m: any) => m.id || m);
        result.capabilities.push("openai_compatible");
      }
    }
  } catch (e) {
    console.warn("Introspection: /models probe failed", e);
  }

  // 3. Infer Capabilities from Model Names
  const allModels = result.discoveredModels.join(" ").toLowerCase();
  if (allModels.includes("gpt") || allModels.includes("claude") || allModels.includes("llama") || allModels.includes("chat")) {
    result.capabilities.push("text");
  }
  if (allModels.includes("dall-e") || allModels.includes("flux") || allModels.includes("stable-diffusion") || allModels.includes("image")) {
    result.capabilities.push("image_generation");
  }
  if (allModels.includes("vision") || allModels.includes("multimodal")) {
    result.capabilities.push("vision");
  }
  if (allModels.includes("video") || allModels.includes("luma") || allModels.includes("kling")) {
    result.capabilities.push("video_generation");
  }

  // 4. Special checks for known optimized providers if not already found
  if (providerId.includes("replicate") || providerId.includes("fal")) {
    result.capabilities.push("async_job", "polling_required");
  }

  result.latencyMs = Date.now() - start;
  return result;
}
