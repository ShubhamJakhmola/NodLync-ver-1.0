import type { ApiResponse } from "../../../api/apiHelper";
import {
  createFolder,
  createWorkflow,
  deleteWorkflow,
  getWorkflowRow,
  listFolders,
  listWorkflows,
  listWorkflowsTaggedToUser,
  updateWorkflow,
  type WorkflowsRow,
} from "../../../api/workflowsApi";
import type { WorkflowDefinition, WorkflowSourceType } from "../domain";

export type WorkflowRecord = {
  id: string;
  user_id: string;
  name: string;
  description: string;
  source_type: WorkflowSourceType;
  raw_json: WorkflowDefinition | Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type WorkflowFolder = { id: string; name: string; created_at: string };

const ROOT_PREFIX = "__wf_root__:";

function rootFolderName(userId: string) {
  return `${ROOT_PREFIX}${userId}`;
}

function toRecord(row: WorkflowsRow, userId: string): WorkflowRecord {
  const json = row.json_data ?? {};
  const meta = (json as any)?.__nodlync ?? {};
  const source = meta.source_type ?? meta.sourceType ?? "manual";
  const source_type: WorkflowSourceType =
    source === "ai_generated" || source === "imported" || source === "manual" ? source : "manual";

  return {
    id: row.id,
    user_id: userId,
    name: row.name,
    description: String((json as any)?.description ?? meta.description ?? ""),
    source_type,
    raw_json: json,
    created_at: row.created_at,
    updated_at: String(meta.updated_at ?? row.created_at),
  };
}

function withMeta(rawJson: any, meta: Record<string, unknown>) {
  const base = rawJson && typeof rawJson === "object" && !Array.isArray(rawJson) ? rawJson : { raw: rawJson };
  const existing = (base as any).__nodlync && typeof (base as any).__nodlync === "object" ? (base as any).__nodlync : {};
  return { ...base, __nodlync: { ...existing, ...meta } };
}

export async function ensureUserRootFolder(userId: string): Promise<ApiResponse<WorkflowFolder>> {
  const wanted = rootFolderName(userId);
  const { data, error } = await listFolders();
  if (error) return { data: null, error };
  const existing = (data ?? []).find((f) => f.name === wanted);
  if (existing) return { data: { id: existing.id, name: existing.name, created_at: existing.created_at }, error: null };

  const created = await createFolder(wanted);
  if (created.error || !created.data) return { data: null, error: created.error };
  return { data: { id: created.data.id, name: created.data.name, created_at: created.data.created_at }, error: null };
}

export async function listWorkflowRecords(userId: string): Promise<ApiResponse<WorkflowRecord[]>> {
  const root = await ensureUserRootFolder(userId);
  if (root.error || !root.data) return { data: null, error: root.error };

  const [byFolder, byTag] = await Promise.all([
    listWorkflows(root.data.id),
    listWorkflowsTaggedToUser(userId),
  ]);

  if (byFolder.error) return { data: null, error: byFolder.error };
  if (byTag.error) return { data: null, error: byTag.error };

  const merged = [...(byFolder.data ?? []), ...(byTag.data ?? [])];
  const seen = new Set<string>();
  const unique: WorkflowsRow[] = [];
  for (const row of merged) {
    if (!row?.id || seen.has(row.id)) continue;
    seen.add(row.id);
    unique.push(row);
  }

  const records = unique
    .filter((r) => r.type === "workflow")
    .map((r) => toRecord(r, userId))
    .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));

  return { data: records, error: null };
}

export async function getWorkflowRecord(userId: string, id: string): Promise<ApiResponse<WorkflowRecord>> {
  const { data, error } = await getWorkflowRow(id);
  if (error || !data) return { data: null, error };
  if (data.type !== "workflow") return { data: null, error: { message: "Not a workflow row." } as any };
  return { data: toRecord(data, userId), error: null };
}

export async function createWorkflowRecord(input: {
  userId: string;
  name: string;
  description?: string;
  sourceType: WorkflowSourceType;
  rawJson: any;
}): Promise<ApiResponse<WorkflowRecord>> {
  const root = await ensureUserRootFolder(input.userId);
  if (root.error || !root.data) return { data: null, error: root.error };

  const now = new Date().toISOString();
  const json_data = withMeta(input.rawJson, {
    userId: input.userId,
    source_type: input.sourceType,
    description: input.description ?? "",
    updated_at: now,
  });

  const created = await createWorkflow({
    name: input.name.trim() || "New Workflow",
    parent_id: root.data.id,
    json_data,
  });

  if (created.error || !created.data) return { data: null, error: created.error };
  return { data: toRecord(created.data, input.userId), error: null };
}

export async function updateWorkflowRecord(input: {
  userId: string;
  id: string;
  name?: string;
  description?: string;
  rawJson?: any;
  sourceType?: WorkflowSourceType;
}): Promise<ApiResponse<WorkflowRecord>> {
  const now = new Date().toISOString();
  const json_data =
    input.rawJson !== undefined || input.description !== undefined || input.sourceType
      ? withMeta(input.rawJson ?? {}, {
          userId: input.userId,
          source_type: input.sourceType,
          description: input.description,
          updated_at: now,
        })
      : undefined;

  const updated = await updateWorkflow({
    id: input.id,
    name: input.name,
    json_data,
  });
  if (updated.error || !updated.data) return { data: null, error: updated.error };
  return { data: toRecord(updated.data, input.userId), error: null };
}

export async function deleteWorkflowRecord(id: string): Promise<ApiResponse<null>> {
  return deleteWorkflow(id);
}
