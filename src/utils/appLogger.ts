import { createLog } from "../api/appLogsApi";
import useAppStore from "../store/useAppStore";
import { centralLog } from "../services/centralLogService";
import type { SystemLogEntry, SystemLogType } from "../types";

function localLogEntry(payload: {
  type: SystemLogType;
  module: string;
  message: string;
}): SystemLogEntry {
  const timestamp = new Date().toISOString();
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `local-${Math.random().toString(36).slice(2, 10)}`;
  return { id, type: payload.type, module: payload.module, message: payload.message, timestamp };
}

// Map old SystemLogType to new LogLevel
function mapLogLevel(type: SystemLogType): "debug" | "info" | "warning" | "error" | "fatal" {
  switch (type) {
    case "success":
      return "info";
    case "error":
      return "error";
    case "info":
    default:
      return "info";
  }
}

export async function logAppEvent(payload: {
  type: SystemLogType;
  module: string;
  message: string;
  projectId?: string;
  meta?: Record<string, unknown>;
}) {
  const { user, addAppLog } = useAppStore.getState();
  if (!user) return;

  // Create legacy log entry for backward compatibility
  const legacyEntry = localLogEntry(payload);

  // Create new centralized log entry
  const level = mapLogLevel(payload.type);
  centralLog.log(
    level,
    payload.module,
    "app",
    "frontend",
    payload.message,
    {
      ...payload.meta,
      legacyType: payload.type,
      projectId: payload.projectId,
    },
    user.id,
    payload.projectId
  );

  // Try to store in database using new API
  try {
    const { data } = await createLog({
      level,
      module: payload.module,
      service: "app",
      source: "frontend",
      message: payload.message,
      metadata: {
        ...payload.meta,
        legacyType: payload.type,
        projectId: payload.projectId,
      },
      userId: user.id,
      projectId: payload.projectId,
    });

    if (data) {
      // Update both legacy and new stores
      addAppLog(legacyEntry);
      return;
    }
  } catch {
    // Fall through to local storage
  }

  // Fallback: store locally
  addAppLog(legacyEntry);
}

// Enhanced logging functions for different sources
export const logFrontend = (module: string, service: string, level: "debug" | "info" | "warning" | "error" | "fatal", message: string, metadata?: Record<string, unknown>, userId?: string, projectId?: string) => {
  return centralLog.log(level, module, service, "frontend", message, metadata, userId, projectId);
};

export const logBackend = (module: string, service: string, level: "debug" | "info" | "warning" | "error" | "fatal", message: string, metadata?: Record<string, unknown>, userId?: string, projectId?: string) => {
  return centralLog.log(level, module, service, "backend", message, metadata, userId, projectId);
};

export const logWorker = (module: string, service: string, level: "debug" | "info" | "warning" | "error" | "fatal", message: string, metadata?: Record<string, unknown>, userId?: string, projectId?: string) => {
  return centralLog.log(level, module, service, "worker", message, metadata, userId, projectId);
};

export const logIntegration = (module: string, service: string, level: "debug" | "info" | "warning" | "error" | "fatal", message: string, metadata?: Record<string, unknown>, userId?: string, projectId?: string) => {
  return centralLog.log(level, module, service, "integration", message, metadata, userId, projectId);
};

export const logAI = (module: string, service: string, level: "debug" | "info" | "warning" | "error" | "fatal", message: string, metadata?: Record<string, unknown>, userId?: string, projectId?: string) => {
  return centralLog.log(level, module, service, "ai", message, metadata, userId, projectId);
};

export const logSystem = (module: string, service: string, level: "debug" | "info" | "warning" | "error" | "fatal", message: string, metadata?: Record<string, unknown>, userId?: string, projectId?: string) => {
  return centralLog.log(level, module, service, "system", message, metadata, userId, projectId);
};

// Convenience functions for common logging patterns
export const logUserAction = (action: string, component: string, metadata?: Record<string, unknown>) => {
  const user = useAppStore.getState().user;
  return logFrontend("ui", component, "info", `User action: ${action}`, {
    action,
    component,
    ...metadata,
  }, user?.id);
};

export const logAPIError = (error: Error, endpoint: string, metadata?: Record<string, unknown>) => {
  const user = useAppStore.getState().user;
  return logFrontend("api", "http-client", "error", `API error: ${error.message}`, {
    endpoint,
    error: error.message,
    stack: error.stack,
    ...metadata,
  }, user?.id);
};

export const logPerformance = (metric: string, value: number, unit: string = "ms", metadata?: Record<string, unknown>) => {
  const user = useAppStore.getState().user;
  return logSystem("performance", "monitor", "info", `Performance metric: ${metric} = ${value}${unit}`, {
    metric,
    value,
    unit,
    ...metadata,
  }, user?.id);
};

// Export central log service for direct access
export { centralLog };

