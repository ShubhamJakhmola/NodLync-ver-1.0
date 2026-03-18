import { supabase } from "./supabaseClient";

export interface MeetingLink {
  id: string;
  user_id: string;
  title: string;
  platform: string;
  meeting_url: string;
  scheduled_at: string;
  description?: string;
  created_at: string;
}

export async function getMeetings(userId: string) {
  try {
    const result = await supabase
      .from("meeting_links")
      .select("*")
      .eq("user_id", userId)
      .order("scheduled_at", { ascending: true });
    return { data: (result.data ?? []) as MeetingLink[], error: null };
  } catch (err: any) {
    return { data: [] as MeetingLink[], error: err };
  }
}

export async function createMeeting(payload: Omit<MeetingLink, "id" | "created_at">) {
  try {
    const result = await supabase
      .from("meeting_links")
      .insert(payload)
      .select()
      .single();
    return { data: result.data as MeetingLink | null, error: result.error };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

export async function updateMeeting(id: string, payload: Partial<Omit<MeetingLink, "id" | "user_id" | "created_at">>) {
  try {
    const result = await supabase
      .from("meeting_links")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    return { data: result.data as MeetingLink | null, error: result.error };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

export async function deleteMeeting(id: string) {
  try {
    const result = await supabase.from("meeting_links").delete().eq("id", id);
    return { data: true, error: result.error };
  } catch (err: any) {
    return { data: false, error: err };
  }
}
