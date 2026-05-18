/**
 * NodLync Media Generation Runtime — Provider Adapters
 *
 * Each adapter knows how to build requests and parse responses
 * for a specific media provider. The edge function handles
 * transport/auth/decryption — adapters handle provider semantics.
 */

import type {
  MediaProviderAdapter,
  MediaProviderRequest,
} from "./types";

// ─── Provider Adapters ───────────────────────────────────────────────────────

export const openaiMedia: MediaProviderAdapter = {
  id: "openai",
  label: "OpenAI",
  supportedModalities: ["image"],

  buildRequest(keyId, prompt, model, _modality, options): MediaProviderRequest {
    return {
      action: "http",
      keyId,
      request: {
        url: "https://api.openai.com/v1/images/generations",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: {
          model: model || "dall-e-3",
          prompt,
          n: options?.n ?? 1,
          size: `${options?.width ?? 1024}x${options?.height ?? 1024}`,
          quality: options?.quality ?? "standard",
          ...(options?.style ? { style: options.style } : {}),
        },
      },
    };
  },

  parseResponse(raw) {
    const data = extractNested(raw);
    if (data?.data?.[0]) {
      const item = data.data[0];
      return {
        done: true,
        result: {
          url: item.url,
          base64: item.b64_json,
          mimeType: "image/png",
          metadata: { revised_prompt: item.revised_prompt },
        },
      };
    }
    return { done: true, error: extractErrorMessage(raw) || "OpenAI returned an empty response." };
  },

  getModels() {
    return [
      { 
        label: "DALL·E 3", 
        value: "dall-e-3", 
        capabilities: ["image_generation"],
        description: "OpenAI's most capable image model."
      },
      { 
        label: "DALL·E 2", 
        value: "dall-e-2", 
        capabilities: ["image_generation"],
        description: "Faster, older version of DALL·E."
      },
    ];
  },
};

export const stabilityMedia: MediaProviderAdapter = {
  id: "stability",
  label: "Stability AI",
  supportedModalities: ["image"],

  buildRequest(keyId, prompt, _model, _modality, options): MediaProviderRequest {
    return {
      action: "http",
      keyId,
      request: {
        url: "https://api.stability.ai/v2beta/stable-image/generate/core",
        method: "POST",
        headers: { 
          "Accept": "application/json", 
          "Content-Type": "application/json" 
        },
        auth: { scheme: "bearer" },
        body: {
          prompt,
          output_format: options?.outputFormat ?? "png",
          ...(options?.negativePrompt ? { negative_prompt: options.negativePrompt } : {}),
          ...(options?.seed !== undefined ? { seed: options.seed } : {}),
          aspect_ratio: options?.width && options?.height 
            ? calculateAspectRatio(options.width, options.height)
            : "1:1"
        },
      },
    };
  },

  parseResponse(raw) {
    const data = extractNested(raw);
    if (data?.image) {
      return { done: true, result: { base64: data.image, mimeType: "image/png" } };
    }
    if (data?.finish_reason && data.finish_reason !== "SUCCESS") {
      return { done: true, error: `Stability error: ${data.finish_reason}` };
    }
    return { done: true, error: extractErrorMessage(raw) || "No image returned from Stability." };
  },

  getModels() {
    return [
      { 
        label: "Stable Image Core", 
        value: "stable-image-core", 
        capabilities: ["image_generation"],
        description: "Fast, versatile image generation."
      },
      { 
        label: "SDXL 1.0", 
        value: "stable-diffusion-xl-1024-v1-0", 
        capabilities: ["image_generation"] 
      }
    ];
  },
};

export const replicateMedia: MediaProviderAdapter = {
  id: "replicate",
  label: "Replicate",
  supportedModalities: ["image", "video"],

  buildRequest(keyId, prompt, model, _modality, options): MediaProviderRequest {
    return {
      action: "http",
      keyId,
      request: {
        url: "https://api.replicate.com/v1/predictions",
        method: "POST",
        auth: { scheme: "bearer" },
        body: {
          version: model,
          input: {
            prompt,
            ...(options?.width ? { width: options.width } : {}),
            ...(options?.height ? { height: options.height } : {}),
            ...(options?.negativePrompt ? { negative_prompt: options.negativePrompt } : {}),
            ...(options?.seed !== undefined ? { seed: options.seed } : {}),
          },
        },
      },
    };
  },

  parseResponse(raw) {
    const data = extractNested(raw);
    const status = data?.status?.toLowerCase?.() ?? "";

    if (["queued", "starting", "processing", "in_progress"].includes(status)) {
      const pollUrl = data?.urls?.get;
      if (pollUrl) return { done: false, pollUrl };
    }

    if (status === "succeeded" || status === "completed") {
      const output = data?.output;
      if (typeof output === "string") return { done: true, result: { url: output } };
      if (Array.isArray(output) && output[0]) return { done: true, result: { url: output[0] } };
    }

    if (status === "failed") return { done: true, error: data?.error ?? "Replicate generation failed." };
    if (status === "canceled") return { done: true, error: "Replicate generation was canceled." };
    
    return { done: true, error: extractErrorMessage(raw) || "Unexpected Replicate response status." };
  },

  getModels(modality) {
    if (modality === "video") {
      return [
        { 
          label: "Luma Dream Machine", 
          value: "lucataco/luma-dream-machine", 
          capabilities: ["video_generation", "async_job", "polling_required"] 
        },
        { 
          label: "Minimax Video", 
          value: "minimax/video-01", 
          capabilities: ["video_generation", "async_job", "polling_required"] 
        },
      ];
    }
    return [
      { 
        label: "Flux Schnell", 
        value: "black-forest-labs/flux-schnell", 
        capabilities: ["image_generation", "async_job", "polling_required"] 
      },
      { 
        label: "Flux Pro", 
        value: "black-forest-labs/flux-pro", 
        capabilities: ["image_generation", "async_job", "polling_required"] 
      },
      { 
        label: "SDXL (Lighting)", 
        value: "bytedance/sdxl-lightning-4step", 
        capabilities: ["image_generation", "async_job", "polling_required"] 
      }
    ];
  },
};

export const falMedia: MediaProviderAdapter = {
  id: "fal",
  label: "Fal.ai",
  supportedModalities: ["image", "video", "audio"],

  buildRequest(keyId, prompt, model, _modality, options): MediaProviderRequest {
    const endpoint = `https://queue.fal.run/${model}`;
    return {
      action: "http",
      keyId,
      request: {
        url: endpoint,
        method: "POST",
        auth: { scheme: "bearer" },
        body: {
          prompt,
          ...(options?.width ? { image_size: { width: options.width, height: options.height ?? options.width } } : {}),
          ...(options?.negativePrompt ? { negative_prompt: options.negativePrompt } : {}),
          ...(options?.seed !== undefined ? { seed: options.seed } : {}),
        },
      },
    };
  },

  parseResponse(raw) {
    const data = extractNested(raw);
    if (data?.request_id && !data.images && !data.video) {
      return { 
        done: false, 
        pollUrl: `https://queue.fal.run/${data.model_name || "request"}/requests/${data.request_id}` 
      };
    }
    if (data?.images?.[0]?.url) return { done: true, result: { url: data.images[0].url } };
    if (data?.video?.url) return { done: true, result: { url: data.video.url, mimeType: "video/mp4" } };
    if (data?.url) return { done: true, result: { url: data.url } };
    return { done: true, error: extractErrorMessage(raw) || "Fal.ai returned an empty response." };
  },

  parsePollResponse(raw) {
    const data = extractNested(raw);
    const status = data?.status?.toLowerCase?.() ?? "";
    if (status === "in_progress" || status === "in_queue") return { done: false };
    if (status === "completed") {
      const result = data?.response || data;
      if (result.images?.[0]?.url) return { done: true, result: { url: result.images[0].url } };
      if (result.video?.url) return { done: true, result: { url: result.video.url, mimeType: "video/mp4" } };
      if (result.audio?.url) return { done: true, result: { url: result.audio.url, mimeType: "audio/mpeg" } };
      if (result.url) return { done: true, result: { url: result.url } };
    }
    if (status === "failed") return { done: true, error: data?.error || "Fal.ai job failed." };
    return { done: false };
  },

  getModels(modality) {
    if (modality === "video") {
      return [
        { 
          label: "Kling Video", 
          value: "fal-ai/kling-video/v1/standard/text-to-video", 
          capabilities: ["video_generation", "async_job", "polling_required"] 
        },
        { 
          label: "Luma Dream Machine", 
          value: "fal-ai/luma-dream-machine", 
          capabilities: ["video_generation", "async_job", "polling_required"] 
        },
      ];
    }
    if (modality === "audio") {
      return [
        { 
          label: "Stable Audio", 
          value: "fal-ai/stable-audio", 
          capabilities: ["audio_generation", "async_job", "polling_required"] 
        }
      ];
    }
    return [
      { 
        label: "Flux Pro", 
        value: "fal-ai/flux-pro", 
        capabilities: ["image_generation", "async_job", "polling_required"] 
      },
      { 
        label: "Flux Realism", 
        value: "fal-ai/flux-realism", 
        capabilities: ["image_generation", "async_job", "polling_required"] 
      },
    ];
  },
};

export const openrouterMedia: MediaProviderAdapter = {
  id: "openrouter",
  label: "OpenRouter",
  supportedModalities: ["image"],

  buildRequest(keyId, prompt, model): MediaProviderRequest {
    return {
      action: "http",
      keyId,
      request: {
        url: "https://openrouter.ai/api/v1/images/generations",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: {
          model,
          prompt,
          n: 1,
        },
      },
    };
  },

  parseResponse(raw) {
    const data = extractNested(raw);
    const item = data?.data?.[0];
    if (item?.url || item?.b64_json) {
      return {
        done: true,
        result: {
          url: item.url,
          base64: item.b64_json,
          mimeType: "image/png",
          metadata: { revised_prompt: item.revised_prompt },
        },
      };
    }
    return { done: true, error: extractErrorMessage(raw) || "OpenRouter returned an empty image response." };
  },

  getModels(modality) {
    if (modality === "image") {
      return [
        { 
          label: "OpenAI: DALL-E 3", 
          value: "openai/dall-e-3", 
          capabilities: ["image_generation"] 
        },
        { 
          label: "Google: Imagen 3 (Exp)", 
          value: "google/imagen-3", 
          capabilities: ["image_generation", "experimental"] 
        },
      ];
    }
    return [];
  },
};

export const togetherMedia: MediaProviderAdapter = {
  id: "together",
  label: "Together AI",
  supportedModalities: ["image"],

  buildRequest(keyId, prompt, model, _modality, options): MediaProviderRequest {
    return {
      action: "http",
      keyId,
      request: {
        url: "https://api.together.xyz/v1/images/generations",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        auth: { scheme: "bearer" },
        body: {
          model,
          prompt,
          n: options?.n ?? 1,
          width: options?.width ?? 1024,
          height: options?.height ?? 1024,
          steps: options?.steps ?? 20,
        },
      },
    };
  },

  parseResponse(raw) {
    const data = extractNested(raw);
    if (data?.data?.[0]?.url) {
      return { done: true, result: { url: data.data[0].url } };
    }
    return { done: true, error: extractErrorMessage(raw) || "Together AI returned an empty response." };
  },

  getModels() {
    return [
      { 
        label: "Flux.1 Schnell", 
        value: "black-forest-labs/FLUX.1-schnell", 
        capabilities: ["image_generation"] 
      },
      { 
        label: "SDXL 1.0", 
        value: "stabilityai/stable-diffusion-xl-base-1.0", 
        capabilities: ["image_generation"] 
      }
    ];
  },
};

export const huggingfaceMedia: MediaProviderAdapter = {
  id: "huggingface",
  label: "Hugging Face",
  supportedModalities: ["image", "audio"],

  buildRequest(keyId, prompt, model, _modality): MediaProviderRequest {
    const baseUrl = "https://api-inference.huggingface.co/models";
    return {
      action: "http",
      keyId,
      request: {
        url: `${baseUrl}/${model}`,
        method: "POST",
        auth: { scheme: "bearer" },
        body: { inputs: prompt },
      },
    };
  },

  parseResponse(raw) {
    const data = extractNested(raw);
    // HF usually returns a blob or base64 if requested, but our proxy might return it as data
    if (data?.url) return { done: true, result: { url: data.url } };
    if (typeof data === "string" && data.startsWith("data:")) {
      return { done: true, result: { base64: data.split(",")[1], mimeType: "image/png" } };
    }
    return { done: true, error: extractErrorMessage(raw) || "Could not parse Hugging Face response." };
  },

  getModels(modality) {
    if (modality === "image") {
      return [
        { label: "Stable Diffusion XL", value: "stabilityai/stable-diffusion-xl-base-1.0", capabilities: ["image_generation"] },
        { label: "Flux.1 Dev", value: "black-forest-labs/FLUX.1-dev", capabilities: ["image_generation"] },
      ];
    }
    if (modality === "audio") {
      return [
        { label: "Riffusion", value: "riffusion/riffusion-600k", capabilities: ["audio_generation"] },
      ];
    }
    return [];
  },
};

export const fallbackMedia: MediaProviderAdapter = {
  id: "fallback",
  label: "Generic",
  supportedModalities: ["image", "video", "audio"],

  buildRequest(keyId, prompt, model, _modality, options): MediaProviderRequest {
    return {
      action: "http",
      keyId,
      request: {
        url: "", 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: { prompt, model, ...(options?.extra ?? {}) },
      },
    };
  },

  parseResponse(raw) {
    const data = extractNested(raw);
    const url = data?.url ?? data?.image_url ?? data?.video_url ?? data?.output?.[0] ?? data?.result?.url;
    if (typeof url === "string") return { done: true, result: { url } };
    if (data?.b64_json) return { done: true, result: { base64: data.b64_json, mimeType: "image/png" } };
    return { done: true, error: extractErrorMessage(raw) || "Could not parse generic media response." };
  },

  getModels() {
    return [];
  },
};

// ─── Adapter Registry ────────────────────────────────────────────────────────

const MEDIA_ADAPTERS: MediaProviderAdapter[] = [
  openaiMedia,
  openrouterMedia,
  stabilityMedia,
  replicateMedia,
  falMedia,
  togetherMedia,
  huggingfaceMedia,
];

export function resolveMediaAdapter(providerId: string): MediaProviderAdapter {
  const key = providerId.toLowerCase();
  const adapter = MEDIA_ADAPTERS.find((a) => key.includes(a.id));
  return adapter || fallbackMedia;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractNested(raw: any): any {
  if (!raw || typeof raw !== "object") return null;
  return raw.data?.body ?? raw.data ?? raw.body ?? raw;
}

function extractErrorMessage(raw: any): string {
  if (!raw || typeof raw !== "object") return "";
  const nested = raw.data ?? raw;
  const errorObj = nested?.error;
  if (typeof errorObj === "string") return errorObj;
  return errorObj?.message ?? nested?.message ?? "";
}

function calculateAspectRatio(width: number, height: number): string {
  if (width === height) return "1:1";
  if (width > height) {
    if (Math.abs(width / height - 16 / 9) < 0.1) return "16:9";
    if (Math.abs(width / height - 3 / 2) < 0.1) return "3:2";
    if (Math.abs(width / height - 4 / 3) < 0.1) return "4:3";
    return "21:9";
  } else {
    if (Math.abs(height / width - 16 / 9) < 0.1) return "9:16";
    if (Math.abs(height / width - 3 / 2) < 0.1) return "2:3";
    if (Math.abs(height / width - 4 / 3) < 0.1) return "3:4";
    return "9:21";
  }
}
