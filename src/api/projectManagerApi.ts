import { supabase } from "./supabaseClient";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TaskItem {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  status: "todo" | "in_progress" | "done";
  item_type: "task" | "milestone";
  due_date?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface DailyLogPayload {
  completed: string;
  next_steps: string;
  blockers: string;
  notes: string;
}

export interface ProjectNote {
  id: string;
  project_id: string;
  user_id: string;
  note_type: string;
  content: string;
  created_at: string;
}

export interface ProjectActivity {
  id: string;
  project_id: string;
  user_id: string;
  action: string;
  details?: string | null;
  created_at: string;
}

// ─── Task Items ───────────────────────────────────────────────────────────────

export async function getTaskItems(projectId: string) {
  try {
    const result = await supabase
      .from("task_items")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });
    if (result.error) return { data: [] as TaskItem[], error: result.error };
    return { data: (result.data ?? []) as TaskItem[], error: null };
  } catch {
    return { data: [] as TaskItem[], error: null };
  }
}

export async function createTaskItem(payload: Omit<TaskItem, "id" | "created_at" | "updated_at">) {
  const result = await supabase
    .from("task_items")
    .insert(payload)
    .select()
    .single();
  return result as { data: TaskItem | null; error: { message: string } | null };
}

export async function updateTaskItem(id: string, payload: Partial<TaskItem>) {
  const result = await supabase
    .from("task_items")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  return result as { data: TaskItem | null; error: { message: string } | null };
}

export async function deleteTaskItem(id: string) {
  return supabase.from("task_items").delete().eq("id", id);
}

// ─── Project Notes / Daily Logs ───────────────────────────────────────────────

export async function getProjectNotes(projectId: string) {
  try {
    const result = await supabase
      .from("project_notes")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (result.error) return { data: [] as ProjectNote[], error: result.error };
    return { data: (result.data ?? []) as ProjectNote[], error: null };
  } catch {
    return { data: [] as ProjectNote[], error: null };
  }
}

export async function createDailyLog(payload: {
  project_id: string;
  user_id: string;
  log: DailyLogPayload;
}) {
  try {
    const result = await supabase
      .from("project_notes")
      .insert({
        project_id: payload.project_id,
        user_id: payload.user_id,
        note_type: "daily_log",
        content: JSON.stringify(payload.log),
      })
      .select()
      .single();
    return result as { data: ProjectNote | null; error: { message: string } | null };
  } catch {
    return { data: null, error: { message: "Failed to save log." } };
  }
}

// ─── Project Activities ───────────────────────────────────────────────────────

export async function getProjectActivities(projectId: string) {
  try {
    const result = await supabase
      .from("project_activities")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (result.error) return { data: [] as ProjectActivity[], error: result.error };
    return { data: (result.data ?? []) as ProjectActivity[], error: null };
  } catch {
    return { data: [] as ProjectActivity[], error: null };
  }
}

export async function createProjectActivity(payload: Omit<ProjectActivity, "id" | "created_at">) {
  try {
    await supabase.from("project_activities").insert(payload);
  } catch {
    // silently fail — activity logging should never break the main flow
  }
}
