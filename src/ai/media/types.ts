/**
 * NodLync Media Generation Runtime — Core Types
 *
 * Separates media generation (image/video/audio) from text chat orchestration.
 * Media jobs follow an async lifecycle instead of chat/completions semantics.
 */

// ─── Job Lifecycle ───────────────────────────────────────────────────────────

export type MediaJobStatus =
  | "queued"
  | "generating"
  | "polling"
  | "completed"
  | "failed"
  | "cancelled"
  | "timeout";

export type MediaModality = "image" | "video" | "audio";

export type MediaCapability =
  | "text"
  | "image_generation"
  | "image_edit"
  | "image_understanding"
  | "video_generation"
  | "audio_generation"
  | "async_job"
  | "streaming"
  | "polling_required"
  | "openai_compatible"
  | "experimental"
  | "vision";

export interface ProviderCapabilityMap {
  id: string;
  capabilities: MediaCapability[];
}

export interface MediaResult {
  url?: string;
  base64?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  durationMs?: number;
  metadata?: Record<string, unknown>;
}

export interface MediaJobError {
  kind: "provider" | "transport" | "validation" | "timeout" | "cancelled" | "routing";
  message: string;
  provider?: string;
  raw?: unknown;
  endpoint?: string;
  statusCode?: number;
  contentType?: string;
}

export interface MediaJob {
  id: string;
  status: MediaJobStatus;
  modality: MediaModality;
  provider: string;
  model: string;
  prompt: string;
  options?: MediaGenerationOptions;
  result?: MediaResult;
  error?: MediaJobError;
  pollUrl?: string;
  pollAttempts: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;

  // Debug Metadata
  debug?: {
    resolvedEndpoint?: string;
    adapterId?: string;
    didPoll?: boolean;
    contentType?: string;
    rawResponse?: unknown;
  };
}

// ─── Generation Options ──────────────────────────────────────────────────────

export interface MediaGenerationOptions {
  width?: number;
  height?: number;
  quality?: "standard" | "hd";
  style?: string;
  negativePrompt?: string;
  steps?: number;
  seed?: number;
  n?: number;
  outputFormat?: string;
  /** Provider-specific extra fields passed through untouched. */
  extra?: Record<string, unknown>;
}

// ─── Provider Adapter Interface ──────────────────────────────────────────────

/**
 * The edge function request shape — matches existing transport contract.
 * action: "http" for standard requests, adapter can set it.
 */
export interface MediaProviderRequest {
  action: "http";
  keyId: string;
  request: {
    url: string;
    method: string;
    headers?: Record<string, string>;
    auth?: { scheme: "bearer" | "header" | "query"; headerName?: string; param?: string };
    body?: unknown;
  };
}

export interface MediaProviderParseResult {
  done: boolean;
  result?: MediaResult;
  pollUrl?: string;
  error?: string;
}

export interface MediaModel {
  label: string;
  value: string;
  capabilities: MediaCapability[];
  description?: string;
}

export interface MediaProviderAdapter {
  id: string;
  label: string;
  supportedModalities: MediaModality[];

  /** Build the initial generation request payload for the edge function. */
  buildRequest(
    keyId: string,
    prompt: string,
    model: string,
    modality: MediaModality,
    options?: MediaGenerationOptions,
  ): MediaProviderRequest;

  /** Parse the provider response. If `done: false`, polling continues. */
  parseResponse(raw: unknown): MediaProviderParseResult;

  /** Parse a polling response. Same contract as parseResponse. */
  parsePollResponse?(raw: unknown): MediaProviderParseResult;

  /** Default models available for this provider + modality. */
  getModels(modality: MediaModality): MediaModel[];
}
