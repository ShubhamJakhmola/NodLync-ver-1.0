import { supabase } from "./supabaseClient";
import { type ApiResponse } from "./apiHelper";

/**
 * Production API Vault API backed by `api_keys` and the `ai-proxy` edge function.
 */

export interface ApiVaultItem {
  id: string;
  user_id: string;
  key_name: string;
  provider: string;
  baseUrl?: string;
  metadata?: Record<string, any>;
  created_at: string | null;
  description?: string | null;
  tags?: string | null;
}

export interface CreateApiVaultInput {
  key_name: string;
  provider: string;
  apiKey: string;
  baseUrl?: string;
  description?: string;
  tags?: string;
}

const TABLE_NAME = "api_keys";

async function tryParseJson(text: string): Promise<any | null> {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function extractFunctionErrorMessage(error: any): Promise<string> {
  const directJson = error?.context?.json;
  if (directJson) {
    const nested = directJson.error ?? directJson.message;
    if (typeof nested === "string" && nested.trim()) return nested;
  }

  const directBody = error?.context?.body;
  if (typeof directBody === "string" && directBody.trim()) {
    const parsed = await tryParseJson(directBody);
    const nested = parsed?.error ?? parsed?.message ?? directBody;
    if (typeof nested === "string" && nested.trim()) return nested;
  }

  const response = error?.response ?? error?.context;
  if (response && (typeof response.text === "function" || typeof response.json === "function")) {
    try {
      const clone = typeof response.clone === "function" ? response.clone() : response;
      if (typeof clone.json === "function") {
        const json = await clone.json();
        const nested = json?.error ?? json?.message;
        if (typeof nested === "string" && nested.trim()) return nested;
      }
    } catch {
      // ignore JSON parse failures
    }

    try {
      const clone = typeof response.clone === "function" ? response.clone() : response;
      if (typeof clone.text === "function") {
        const text = await clone.text();
        const parsed = await tryParseJson(text);
        const nested = parsed?.error ?? parsed?.message ?? text;
        if (typeof nested === "string" && nested.trim()) return nested;
      }
    } catch {
      // ignore text parse failures
    }
  }

  const message = error?.message;
  if (typeof message === "string" && message.trim()) return message;
  return "Request failed.";
}

async function invokeVaultFunction<T>(body: Record<string, unknown>): Promise<ApiResponse<T>> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) return { data: null, error: sessionError };
  if (!session?.access_token) return { data: null, error: { message: "Not authenticated." } as any };

  const { data, error } = await supabase.functions.invoke("ai-proxy", {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
    body: {
      ...body,
    },
  });

  if (error) {
    const message = await extractFunctionErrorMessage(error);
    console.error("Vault function error", error);
    return { data: null, error: { ...error, message } };
  }

  if (data?.error || data?.message) {
    const message =
      (typeof data.error === "string" && data.error.trim()) ||
      (typeof data.message === "string" && data.message.trim()) ||
      "Request failed.";
    return { data: null, error: { message } as any };
  }

  return { data: (data?.data ?? null) as T, error: null };
}

export async function getApiVaultItems(userId: string): Promise<ApiResponse<ApiVaultItem[]>> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("id, user_id, name, provider, description, tags, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return { data: null, error };

  const rows = (data as any[]) ?? [];
  return {
    data: rows.map((item: any) => {
      let metadata: any = null;
      try {
        if (item.tags?.startsWith("{")) metadata = JSON.parse(item.tags);
      } catch {}

      return {
        id: String(item.id),
        user_id: String(item.user_id),
        key_name: String(item.name),
        provider: String(item.provider || ""),
        baseUrl: metadata?.baseUrl,
        metadata: metadata,
        description: item.description,
        tags: item.tags,
        created_at: item.created_at,
      };
    }),
    error: null,
  };
}

export async function createApiVaultItem(input: CreateApiVaultInput): Promise<ApiResponse<ApiVaultItem>> {
  const { data, error } = await invokeVaultFunction<any>({
    action: "save-key",
    name: input.key_name,
    provider: input.provider,
    apiKey: input.apiKey,
    baseUrl: input.baseUrl,
    description: input.description,
    tags: input.baseUrl ? JSON.stringify({ baseUrl: input.baseUrl }) : input.tags,
  });

  if (error) return { data: null, error };
  
  const record = data;
  return {
    data: {
      id: String(record.Id || record.id),
      user_id: String(record.UserId || record.user_id),
      key_name: String(record.Name || record.name),
      provider: String(record.Provider || record.provider || ""),
      description: record.Description || record.description,
      tags: record.Tags || record.tags,
      created_at: record.CreatedAt || record.created_at
    },
    error: null
  };
}

export async function revealApiVaultItem(id: string): Promise<ApiResponse<string>> {
  return invokeVaultFunction<string>({
    action: "reveal-key",
    keyId: id,
  });
}

export async function deleteApiVaultItem(id: string): Promise<ApiResponse<null>> {
  const { error } = await supabase.from(TABLE_NAME).delete().eq("id", id);
  return { data: null, error };
}

export async function updateApiVaultMetadata(id: string, metadata: Record<string, any>): Promise<ApiResponse<null>> {
  const { error } = await supabase
    .from(TABLE_NAME)
    .update({ tags: JSON.stringify(metadata) })
    .eq("id", id);
  return { data: null, error };
}
