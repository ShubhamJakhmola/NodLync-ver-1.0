import { supabase } from "./supabaseClient";

export async function invokeAiProxyStream(body: Record<string, unknown>, opts?: { signal?: AbortSignal }) {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) throw new Error(sessionError.message);
  if (!session?.access_token) throw new Error("Not authenticated.");

  const baseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!baseUrl || !anonKey) throw new Error("Supabase not configured.");

  const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/functions/v1/ai-proxy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      "x-user-jwt": session.access_token,
    },
    body: JSON.stringify(body),
    signal: opts?.signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Stream request failed (${res.status}).`);
  }

  return res;
}

