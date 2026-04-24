import type { User } from "@supabase/supabase-js";

export type ProjectStatus = "draft" | "active" | "in_progress" | "completed" | "archived";

export type SystemLogType = "info" | "error" | "success";

export interface SystemLogEntry {
  id: string;
  type: SystemLogType;
  module: string;
  message: string;
  timestamp: string;
  raw?: unknown;
}

// Enhanced centralized logging types
export type LogLevel = "debug" | "info" | "warning" | "error" | "fatal";

export type LogSource = "frontend" | "backend" | "worker" | "integration" | "ai" | "system";

export interface LogMetadata {
  [key: string]: unknown;
  duration?: number;
  requestId?: string;
  userAgent?: string;
  url?: string;
  method?: string;
  statusCode?: number;
  error?: string;
  stack?: string;
  component?: string;
  action?: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  module: string;
  service: string;
  source: LogSource;
  message: string;
  metadata: LogMetadata;
  userId?: string;
  projectId?: string;
  sessionId?: string;
}

export interface LogFilter {
  level?: LogLevel | "all";
  module?: string;
  service?: string;
  source?: LogSource | "all";
  search?: string;
  searchQuery?: string;
  startTime?: Date;
  endTime?: Date;
  userId?: string;
  projectId?: string;
}

export interface LogPaginationOptions {
  page?: number;
  pageSize?: number;
  cursor?: string;
  direction?: "newer" | "older";
}

export interface LogQueryResult {
  logs: LogEntry[];
  totalCount: number;
  hasMore: boolean;
  nextCursor?: string;
  statistics?: LogStatistics;
}

export interface LogStatistics {
  totalLogs: number;
  debugLogs: number;
  infoLogs: number;
  warningLogs: number;
  errorLogs: number;
  fatalLogs: number;
  uniqueModules: string[];
  uniqueServices: string[];
  uniqueSources: string[];
  oldestLog?: Date;
  newestLog?: Date;
}

export interface RealtimeLogOptions {
  enabled: boolean;
  bufferSize?: number;
  filter?: LogFilter;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  user_id: string;
  created_at?: string;
  access_role?: "owner" | "admin" | "editor" | "viewer";
  is_shared?: boolean;
}

export interface ProjectPayload {
  name: string;
  description: string;
  status: ProjectStatus;
  user_id: string;
}

export type AppUser = User;

export interface UserProfile {
  id: string; // references auth.users UUID
  display_name: string;
  avatar_url: string;
  updated_at?: string;
}

export interface AppSettings {
  id?: string;
  user_id: string;
  theme: string;
  default_project_view?: string;
  default_ai_provider: string;
  notifications_enabled: boolean;
  auto_update_enabled: boolean;
  updated_at?: string;
}

export interface AppLogRow {
  id: string;
  user_id: string;
  action: string;
  status: "success" | "error" | "info";
  details: unknown;
  created_at: string;
}

// Database schema for existing app_logs table
export interface AppLogsRow {
  "Id": string;
  "Timestamp": string;
  "User": string;
  "Action": string;
  "Status": string;
  "Details": string;
  user_id: string;
  action?: string;
  status?: string;
  details?: string;
  created_at?: string;
  id?: string;
  timestamp?: string;
  user?: string;
}

// Enhanced LogEntry mapped to existing schema
export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  module: string;
  service: string;
  source: LogSource;
  message: string;
  metadata: LogMetadata;
  userId?: string;
  projectId?: string;
  sessionId?: string;
}
