import { supabase } from "./supabaseClient";

export interface UserProfile {
  id: string; // references auth.users UUID
  display_name: string;
  avatar_url: string;
}

export interface AppSettings {
  id: string;
  user_id: string;
  theme: string;
  default_ai_provider: string;
  notifications_enabled: boolean;
  auto_update_enabled: boolean;
}

export interface AppLog {
  id: string;
  user_id: string;
  action: string;
  status: 'success' | 'error' | 'info';
  details: string | any;
  created_at: string;
}

// ── Profile ──
export async function getProfile(userId: string) {
  let { data } = await supabase.from("user_profiles").select("*").eq("id", userId).single();
  
  if (!data) {
    // Attempt auto-creation if not found
    const res = await supabase.from("user_profiles").insert({ id: userId, display_name: "New User", avatar_url: "" }).select().single();
    data = res.data;
  }
  return { data: data as UserProfile | null };
}

export async function updateProfile(userId: string, payload: Partial<UserProfile>) {
  const { data, error } = await supabase.from("user_profiles").update(payload).eq("id", userId).select().single();
  return { data: data as UserProfile | null, error };
}

// ── Settings ──
export async function getSettings(userId: string) {
  let { data } = await supabase.from("app_settings").select("*").eq("user_id", userId).single();
  
  if (!data) {
    const defaultSettings = {
      user_id: userId,
      theme: 'dark',
      default_ai_provider: 'openai',
      notifications_enabled: true,
      auto_update_enabled: true
    };
    const res = await supabase.from("app_settings").insert(defaultSettings).select().single();
    data = res.data;
  }
  return { data: data as AppSettings | null };
}

export async function updateSettings(userId: string, payload: Partial<AppSettings>) {
  const { data, error } = await supabase.from("app_settings").update(payload).eq("user_id", userId).select().single();
  return { data: data as AppSettings | null, error };
}

// ── Logs ──
export async function getLogs(userId: string) {
  const { data, error } = await supabase.from("app_logs").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(100);
  return { data: (data ?? []) as AppLog[], error };
}

export async function clearLogs(userId: string) {
  // Clear all logs for safety or you could just do specific ones stringently
  const { error } = await supabase.from("app_logs").delete().eq("user_id", userId);
  return { error };
}
