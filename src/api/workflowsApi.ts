import { supabase } from "./supabaseClient";
import { handleApiResponse, type ApiResponse } from "./apiHelper";

export type WorkflowRowType = "folder" | "workflow";

export type WorkflowsRow = {
  id: string;
  name: string;
  type: WorkflowRowType;
  parent_id: string | null;
  json_data: any | null;
  created_at: string;
};

const TABLE = "workflows";
const SELECT = "id, name, type, parent_id, json_data, created_at";

export async function listFolders(): Promise<ApiResponse<WorkflowsRow[]>> {
  const promise = supabase
    .from(TABLE)
    .select(SELECT)
    .eq("type", "folder")
    .order("created_at", { ascending: true });
  return handleApiResponse<WorkflowsRow[]>(promise as any);
}

export async function listWorkflows(folderId: string): Promise<ApiResponse<WorkflowsRow[]>> {
  const promise = supabase
    .from(TABLE)
    .select(SELECT)
    .eq("type", "workflow")
    .eq("parent_id", folderId)
    .order("created_at", { ascending: false });
  return handleApiResponse<WorkflowsRow[]>(promise as any);
}

export async function listWorkflowsTaggedToUser(userId: string): Promise<ApiResponse<WorkflowsRow[]>> {
  const promise = supabase
    .from(TABLE)
    .select(SELECT)
    .eq("type", "workflow")
    .filter("json_data->__nodlync->>userId", "eq", userId)
    .order("created_at", { ascending: false });

  return handleApiResponse<WorkflowsRow[]>(promise as any);
}

export async function folderNameExists(name: string): Promise<boolean> {
  const trimmed = name.trim();
  if (!trimmed) return false;
  const { data } = await listFolders();
  if (!data) return false;
  return data.some((r) => r.name.toLowerCase() === trimmed.toLowerCase());
}

export async function createFolder(name: string): Promise<ApiResponse<WorkflowsRow>> {
  const payload = {
    name: name.trim(),
    type: "folder" as const,
    parent_id: null,
    json_data: null,
  };
  const promise = supabase.from(TABLE).insert(payload).select(SELECT).single();
  return handleApiResponse<WorkflowsRow>(promise as any);
}

export async function createWorkflow(payload: {
  name: string;
  parent_id: string;
  json_data: any;
}): Promise<ApiResponse<WorkflowsRow>> {
  const row = {
    name: payload.name.trim(),
    type: "workflow" as const,
    parent_id: payload.parent_id,
    json_data: payload.json_data,
  };
  const promise = supabase.from(TABLE).insert(row).select(SELECT).single();
  return handleApiResponse<WorkflowsRow>(promise as any);
}

export async function updateWorkflow(payload: {
  id: string;
  name?: string;
  json_data?: any;
}): Promise<ApiResponse<WorkflowsRow>> {
  const patch: Record<string, unknown> = {};
  if (typeof payload.name === "string") patch.name = payload.name.trim();
  if (payload.json_data !== undefined) patch.json_data = payload.json_data;

  const promise = supabase.from(TABLE).update(patch).eq("id", payload.id).select(SELECT).single();
  return handleApiResponse<WorkflowsRow>(promise as any);
}

export async function getWorkflowRow(id: string): Promise<ApiResponse<WorkflowsRow>> {
  const promise = supabase.from(TABLE).select(SELECT).eq("id", id).single();
  return handleApiResponse<WorkflowsRow>(promise as any);
}

export async function deleteWorkflow(id: string): Promise<ApiResponse<null>> {
  const promise = supabase.from(TABLE).delete().eq("id", id);
  return handleApiResponse<null>(promise as any);
}

export async function deleteFolderCascade(folderId: string): Promise<ApiResponse<null>> {
  const promise = supabase
    .from(TABLE)
    .delete()
    .or(`id.eq.${folderId},parent_id.eq.${folderId}`);
  return handleApiResponse<null>(promise as any);
}
