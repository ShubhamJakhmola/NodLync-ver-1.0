import { supabase } from "./supabaseClient";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Milestone {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  deadline?: string | null;
  status: "not_started" | "in_progress" | "completed";
  created_at: string;
}

export interface TaskItem {
  id: string;
  project_id: string;
  milestone_id: string;
  title: string;
  deadline?: string | null;
  status: "not_done" | "in_progress" | "done";
  is_completed: boolean;
  priority: "low" | "medium" | "high";
  created_at: string;
}

export interface ProjectLog {
  id: string;
  project_id: string;
  user_id: string;
  completed_work: string;
  next_steps: string;
  blockers: string;
  notes?: string;
  created_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: "Owner" | "Contributor" | "Viewer";
  created_at: string;
  user_profiles?: {
    display_name: string;
  };
}

export interface ProjectReport {
  id: string;
  project_id: string;
  user_id: string;
  type: "today" | "full";
  content: string;
  created_at: string;
}

// ─── Milestones ──────────────────────────────────────────────────────────────

export async function getMilestones(projectId: string) {
  const result = await supabase
    .from("milestones")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  return { data: (result.data ?? []) as Milestone[], error: result.error };
}

export async function createMilestone(payload: Omit<Milestone, "id" | "created_at">) {
  return await supabase.from("milestones").insert(payload).select().single();
}

export async function updateMilestone(id: string, payload: Partial<Milestone>) {
  return await supabase.from("milestones").update(payload).eq("id", id).select().single();
}

export async function deleteMilestone(id: string) {
  return await supabase.from("milestones").delete().eq("id", id);
}

// ─── Task Items ───────────────────────────────────────────────────────────────

export async function getTaskItems(projectId: string) {
  const result = await supabase
    .from("task_items")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  return { data: (result.data ?? []) as TaskItem[], error: result.error };
}

export async function createTaskItem(payload: Omit<TaskItem, "id" | "created_at">) {
  return await supabase.from("task_items").insert(payload).select().single();
}

export async function updateTaskItem(id: string, payload: Partial<TaskItem>) {
  return await supabase.from("task_items").update(payload).eq("id", id).select().single();
}

export async function deleteTaskItem(id: string) {
  return await supabase.from("task_items").delete().eq("id", id);
}

// ─── Project Logs ─────────────────────────────────────────────────────────────

export async function getProjectLogs(projectId: string) {
  const result = await supabase
    .from("project_logs")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(5);
  return { data: (result.data ?? []) as ProjectLog[], error: result.error };
}

export async function getAllProjectLogs(projectId: string) {
  const result = await supabase
    .from("project_logs")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  return { data: (result.data ?? []) as ProjectLog[], error: result.error };
}

export async function getProjectLogsPage(projectId: string, page: number, pageSize: number) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const result = await supabase
    .from("project_logs")
    .select("*", { count: "exact" })
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .range(from, to);
  return {
    data: (result.data ?? []) as ProjectLog[],
    count: result.count ?? 0,
    error: result.error,
  };
}

export async function createProjectLog(payload: Omit<ProjectLog, "id" | "created_at" | "user_profiles">) {
  return await supabase.from("project_logs").insert(payload).select().single();
}

// ─── Project Members ──────────────────────────────────────────────────────────

export async function getProjectMembers(projectId: string) {
  const result = await supabase
    .from("project_members")
    .select(`
      *,
      user_profiles ( display_name )
    `)
    .eq("project_id", projectId);
  return { data: (result.data ?? []) as ProjectMember[], error: result.error };
}

export async function addProjectMember(payload: Omit<ProjectMember, "id" | "created_at" | "user_profiles">) {
  return await supabase.from("project_members").insert(payload).select().single();
}

// ─── Project Reports ──────────────────────────────────────────────────────────

export async function getProjectReports(projectId: string) {
  const result = await supabase
    .from("project_reports")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  return { data: (result.data ?? []) as ProjectReport[], error: result.error };
}

export async function createProjectReport(payload: Omit<ProjectReport, "id" | "created_at">) {
  return await supabase.from("project_reports").insert(payload).select().single();
}
