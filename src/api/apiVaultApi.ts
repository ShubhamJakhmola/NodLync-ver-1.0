import { supabase } from "./supabaseClient";

export interface ApiVaultItem {
  id: string;
  user_id: string;
  key_name: string;
  provider: string;
  api_key: string;
  description: string | null;
  tags: string | null;
  created_at: string | null;
}

export interface CreateApiVaultInput {
  userId: string;
  name: string;
  provider: string;
  apiKey: string;
  description?: string;
  tags?: string;
}

const TABLE_NAME = "api_key_items";

const selectColumns =
  "Id,UserId,Name,Provider,EncryptedValue,InitializationVector,Description,Tags,CreatedAt";

function normalizeItem(row: Record<string, unknown>): ApiVaultItem {
  return {
    id: String(row.Id ?? row.id ?? ""),
    user_id: String(row.UserId ?? row.user_id ?? ""),
    key_name: String(row.Name ?? row.key_name ?? row.name ?? ""),
    provider: String(row.Provider ?? row.provider ?? ""),
    api_key: String(
      row.EncryptedValue ?? row.api_key ?? row.apiKey ?? row.secret ?? ""
    ),
    description:
      typeof row.Description === "string"
        ? row.Description
        : typeof row.description === "string"
          ? row.description
          : row.description == null && row.Description == null
            ? null
            : String(row.Description ?? row.description),
    tags:
      typeof row.Tags === "string"
        ? row.Tags
        : typeof row.tags === "string"
          ? row.tags
          : row.tags == null && row.Tags == null
            ? null
            : String(row.Tags ?? row.tags),
    created_at:
      typeof row.CreatedAt === "string"
        ? row.CreatedAt
        : typeof row.created_at === "string"
          ? row.created_at
          : row.created_at == null && row.CreatedAt == null
            ? null
            : String(row.CreatedAt ?? row.created_at),
  };
}

function isJwtExpiredError(error: { message?: string } | null) {
  return error?.message?.toLowerCase().includes("jwt expired") ?? false;
}

async function withAuthRetry<T>(
  operation: () => Promise<{ data: T; error: { message?: string } | null }>
): Promise<{ data: T; error: { message?: string } | null }> {
  let result = await operation();

  if (!isJwtExpiredError(result.error)) {
    return result;
  }

  const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

  if (refreshError || !refreshData.session) {
    return {
      data: result.data,
      error: {
        message: "Your session expired. Please sign in again and retry.",
      },
    };
  }

  result = await operation();

  if (isJwtExpiredError(result.error)) {
    return {
      data: result.data,
      error: {
        message: "Your session expired. Please sign in again and retry.",
      },
    };
  }

  return result;
}

export async function getApiVaultItems(userId: string) {
  const { data, error } = await withAuthRetry(() =>
    supabase
      .from(TABLE_NAME)
      .select(selectColumns)
      .eq("UserId", userId)
      .order("CreatedAt", { ascending: false })
  );

  return {
    data: ((data ?? []) as unknown[]).map((item: unknown) =>
      normalizeItem(item as Record<string, unknown>)
    ),
    error,
  };
}

export async function createApiVaultItem(input: CreateApiVaultInput) {
  const payload = {
    UserId: input.userId,
    Name: input.name,
    Provider: input.provider,
    EncryptedValue: input.apiKey,
    // Schema requires a value even though we're storing the key as-is for now.
    InitializationVector: "plain-text",
    Description: input.description?.trim() || null,
    Tags: input.tags?.trim() || null,
  };

  const { data, error } = await withAuthRetry(() =>
    supabase.from(TABLE_NAME).insert(payload).select(selectColumns).single()
  );

  return {
    data: data ? normalizeItem(data as Record<string, unknown>) : null,
    error,
  };
}

export async function deleteApiVaultItem(id: string) {
  const { error } = await withAuthRetry(() =>
    supabase.from(TABLE_NAME).delete().eq("Id", id)
  );
  return { error };
}
