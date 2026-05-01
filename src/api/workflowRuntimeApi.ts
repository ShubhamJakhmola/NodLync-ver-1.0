import { supabase } from "./supabaseClient";
import type { ApiResponse } from "./apiHelper";

async function invokeAiProxy<T>(body: Record<string, unknown>): Promise<ApiResponse<T>> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) return { data: null, error: sessionError as any };
  if (!session?.access_token) return { data: null, error: { message: "Not authenticated." } as any };

  const { data, error } = await supabase.functions.invoke("ai-proxy", {
    headers: {
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: { ...body, userJwt: session.access_token },
  });

  if (error) {
    const message = (error as any)?.context?.json?.error || (error as any)?.message || "Request failed.";
    return { data: null, error: { ...(error as any), message } };
  }

  if (data?.error) return { data: null, error: { message: String(data.error) } as any };
  return { data: (data?.data ?? null) as T, error: null };
}

export type VaultHttpRequest = {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  auth?: { scheme: "bearer" } | { scheme: "header"; headerName: string } | { scheme: "query"; param: string };
};

export type VaultHttpResponse = { status: number; headers: Record<string, string>; body: unknown };

export async function vaultHttpRequest(keyId: string, request: VaultHttpRequest): Promise<ApiResponse<VaultHttpResponse>> {
  return invokeAiProxy<VaultHttpResponse>({
    action: "http",
    keyId,
    request,
  });
}

