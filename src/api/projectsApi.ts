import { supabase } from "./supabaseClient";
import type { Project, ProjectPayload } from "../types";

export async function getProjects(userId: string) {
  console.log("[API] getProjects called for user:", userId);
  const result = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  console.log("[API] getProjects result:", result.data?.length ?? 0, "projects, error:", result.error?.message ?? "none");
  return result;
}

export async function createProject(payload: ProjectPayload) {
  console.log("[API] createProject called with:", payload);
  const result = await supabase
    .from("projects")
    .insert(payload)
    .select()
    .single();
  console.log("[API] createProject result:", result.data ? "success" : "failed", "error:", result.error?.message ?? "none");
  return result as { data: Project | null; error: { message: string } | null };
}

export async function updateProject(id: string, payload: Partial<Project>) {
  console.log("[API] updateProject called for id:", id, "with:", payload);
  const result = await supabase
    .from("projects")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  console.log("[API] updateProject result:", result.data ? "success" : "failed", "error:", result.error?.message ?? "none");
  return result as { data: Project | null; error: { message: string } | null };
}

export async function deleteProject(id: string) {
  console.log("[API] deleteProject called for id:", id);
  const result = await supabase.from("projects").delete().eq("id", id);
  console.log("[API] deleteProject result:", result.error ? "failed" : "success", "error:", result.error?.message ?? "none");
  return result;
}
