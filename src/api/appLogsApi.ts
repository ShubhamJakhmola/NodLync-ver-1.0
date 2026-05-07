import { supabase } from "./supabaseClient";
import type {
  LogEntry,
  LogFilter,
  LogPaginationOptions,
  LogStatistics,
  AppLogsRow,
  SystemLogEntry,
} from "../types";

// Helper function to map AppLogsRow to LogEntry
function mapAppLogsRowToLogEntry(row: AppLogsRow): LogEntry {
  const detailsRaw = row.details || row["Details"] || "";
  let parsedDetails: { message?: string; metadata?: Record<string, unknown>; source?: string } = {};
  try {
    const candidate = JSON.parse(detailsRaw);
    if (candidate && typeof candidate === "object") {
      parsedDetails = candidate as any;
    }
  } catch {
    parsedDetails = { message: detailsRaw };
  }

  const actionRaw = row.action || row["Action"] || "";
  const actionParts = actionRaw.split(":");
  const module = actionParts[0] || "app";
  const service = actionParts[1] || "app";
  const source = (actionParts[2] as any) || parsedDetails.source || "frontend";

  return {
    id: row.id || row["Id"],
    timestamp: row.created_at || row["Timestamp"],
    level: mapStatusToLevel(row.status || row["Status"] || "info"),
    module,
    service,
    source,
    message: parsedDetails.message || detailsRaw || "",
    metadata: {
      ...(parsedDetails.metadata || {}),
      originalUser: row["User"],
      originalAction: row["Action"],
      originalStatus: row["Status"],
      originalDetails: row["Details"],
    },
    userId: row.user_id,
  };
}

// Helper function to map LogEntry to AppLogsRow format
function mapLogEntryToAppLogsRow(entry: LogEntry): Partial<AppLogsRow> {
  return {
    user_id: entry.userId,
    action: `${entry.module}:${entry.service}:${entry.source}`,
    status: mapLevelToStatus(entry.level),
    details: JSON.stringify({
      message: entry.message,
      source: entry.source,
      metadata: entry.metadata || {},
      projectId: entry.projectId,
      sessionId: entry.sessionId,
    }),
  };
}

// Helper functions to map between status and level
function mapStatusToLevel(status: string): "debug" | "info" | "warning" | "error" | "fatal" {
  switch (status.toLowerCase()) {
    case "error":
      return "error";
    case "success":
      return "info";
    case "warning":
      return "warning";
    case "fatal":
      return "fatal";
    case "debug":
      return "debug";
    case "info":
    default:
      return "info";
  }
}

function mapLevelToStatus(level: "debug" | "info" | "warning" | "error" | "fatal"): string {
  switch (level) {
    case "error":
      return "error";
    case "warning":
      return "warning";
    case "fatal":
      return "error";
    case "debug":
      return "info";
    case "info":
    default:
      return "success";
  }
}

function extractModuleFromAction(action: string): string {
  const parts = action.split(":");
  return parts[0] || action;
}

// Legacy functions for backward compatibility
export async function createAppLog(payload: {
  userId: string;
  type: "info" | "error" | "success";
  module: string;
  message: string;
  projectId?: string;
  meta?: Record<string, unknown>;
}) {
  const { data, error } = await supabase
    .from("app_logs")
    .insert({
      user_id: payload.userId,
      action: payload.module,
      status: payload.type,
      details: payload.message,
    })
    .select()
    .single();

  if (error) {
    console.error("createAppLog error:", error);
    throw error;
  }
  return { data: normalizeAppLogRow(data as AppLogsRow) };
}

export async function listAppLogs(userId: string, options?: { limit?: number; offset?: number }) {
  let query = supabase
    .from("app_logs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (options?.limit) query = query.limit(options.limit);
  if (options?.offset) query = query.range(options.offset, options.offset + (options.limit || 50) - 1);

  const { data, error } = await query;
  if (error) {
    console.error("listAppLogs error:", error);
    throw error;
  }
  
  return { data: data?.map(normalizeAppLogRow) || [] };
}

export async function clearAppLogs(userId: string) {
  const { error } = await supabase
    .from("app_logs")
    .delete()
    .eq("user_id", userId);
  
  if (error) {
    console.error("clearAppLogs error:", error);
    throw error;
  }
}

// Legacy normalization function
export function normalizeAppLogRow(row: AppLogsRow): SystemLogEntry {
  return {
    id: row.id || row["Id"],
    type: (row.status || row["Status"] || "info") as "info" | "error" | "success",
    module: extractModuleFromAction(row.action || row["Action"] || ""),
    message: row.details || row["Details"] || "",
    timestamp: row.created_at || row["Timestamp"],
    raw: row,
  };
}

// Enhanced centralized logging functions using existing table
export async function createLog(entry: Partial<LogEntry>) {
  const { data, error } = await supabase
    .from("app_logs")
    .insert(mapLogEntryToAppLogsRow(entry as LogEntry))
    .select()
    .single();

  if (error) {
    console.error("createLog error:", error);
    throw error;
  }
  return { data: mapAppLogsRowToLogEntry(data as AppLogsRow) };
}

export async function queryLogs(filter: LogFilter, options: LogPaginationOptions = {}) {
  let query = supabase
    .from("app_logs")
    .select("*", { count: "exact" });

  // Apply filters
  if (filter.userId) {
    query = query.eq("user_id", filter.userId);
  }
  if (filter.level && filter.level !== "all") {
    query = query.eq("status", mapLevelToStatus(filter.level));
  }
  if (filter.module) {
    query = query.like("action", `${filter.module}:%`);
  }
  if (filter.service) {
    query = query.like("action", `%:${filter.service}`);
  }
  if (filter.source) {
    // Source is not directly stored, would need to be inferred from action or metadata
  }
  if (filter.search) {
    query = query.or(`action.ilike.%${filter.search}%,details.ilike.%${filter.search}%`);
  }
  if (filter.searchQuery) {
    query = query.or(`action.ilike.%${filter.searchQuery}%,details.ilike.%${filter.searchQuery}%`);
  }
  if (filter.startTime) {
    query = query.gte("created_at", filter.startTime.toISOString());
  }
  if (filter.endTime) {
    query = query.lte("created_at", filter.endTime.toISOString());
  }

  // Apply pagination
  const pageSize = options.pageSize || 50;
  const page = options.page || 1;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  query = query
    .order("created_at", { ascending: false })
    .range(from, to);

  const { data, error, count } = await query;
  if (error) {
    console.error("queryLogs error:", error);
    throw error;
  }

  const logs = data?.map(mapAppLogsRowToLogEntry) || [];
  const hasMore = count ? from + logs.length < count : false;

  return {
    logs,
    total: count || 0,
    page,
    pageSize,
    hasMore,
  };
}

export async function getLogStatistics(userId: string, startDate?: Date, endDate?: Date): Promise<LogStatistics> {
  let query = supabase
    .from("app_logs")
    .select("*")
    .eq("user_id", userId);

  if (startDate) {
    query = query.gte("created_at", startDate.toISOString());
  }
  if (endDate) {
    query = query.lte("created_at", endDate.toISOString());
  }

  const { data, error } = await query;
  if (error) {
    console.error("getLogStatistics error:", error);
    throw error;
  }

  const logs = data?.map(mapAppLogsRowToLogEntry) || [];
  
  return {
    totalLogs: logs.length,
    debugLogs: logs.filter((l: LogEntry) => l.level === "debug").length,
    infoLogs: logs.filter((l: LogEntry) => l.level === "info").length,
    warningLogs: logs.filter((l: LogEntry) => l.level === "warning").length,
    errorLogs: logs.filter((l: LogEntry) => l.level === "error").length,
    fatalLogs: logs.filter((l: LogEntry) => l.level === "fatal").length,
    uniqueModules: Array.from(new Set(logs.map((l: LogEntry) => l.module))),
    uniqueServices: Array.from(new Set(logs.map((l: LogEntry) => l.service))),
    uniqueSources: Array.from(new Set(logs.map((l: LogEntry) => l.source))),
    oldestLog: logs.length > 0 ? new Date(Math.min(...logs.map((l: LogEntry) => new Date(l.timestamp).getTime()))) : undefined,
    newestLog: logs.length > 0 ? new Date(Math.max(...logs.map((l: LogEntry) => new Date(l.timestamp).getTime()))) : undefined,
  };
}

export async function clearLogs(filter: LogFilter) {
  let query = supabase.from("app_logs").delete();

  if (filter.userId) {
    query = query.eq("user_id", filter.userId);
  }
  if (filter.level && filter.level !== "all") {
    query = query.eq("status", mapLevelToStatus(filter.level));
  }
  if (filter.module) {
    query = query.like("action", `${filter.module}:%`);
  }
  if (filter.startTime) {
    query = query.gte("created_at", filter.startTime.toISOString());
  }
  if (filter.endTime) {
    query = query.lte("created_at", filter.endTime.toISOString());
  }

  const { error } = await query;
  if (error) {
    console.error("clearLogs error:", error);
    throw error;
  }
}

export async function getUniqueLogModules(userId?: string): Promise<string[]> {
  let query = supabase
    .from("app_logs")
    .select("action");

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("getUniqueLogModules error:", error);
    throw error;
  }

  const modules = data?.map((row: any) => extractModuleFromAction(row.action || "")) || [];
  return Array.from(new Set(modules));
}

export async function getUniqueLogServices(userId?: string): Promise<string[]> {
  let query = supabase
    .from("app_logs")
    .select("action");

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("getUniqueLogServices error:", error);
    throw error;
  }

  const services = data?.map((row: any) => {
    const parts = (row.action || "").split(":");
    return parts[1] || "app";
  }) || [];
  return Array.from(new Set(services));
}
