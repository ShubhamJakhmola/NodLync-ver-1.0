import type {
  LogEntry,
  LogLevel,
  LogSource,
  LogFilter,
  LogPaginationOptions,
  LogQueryResult,
  LogMetadata,
  RealtimeLogOptions,
} from "../types";

// In-memory buffer for short-term log storage
const MEMORY_BUFFER_SIZE = 1000;
let memoryBuffer: LogEntry[] = [];

// Event emitter for real-time log streaming
type LogListener = (log: LogEntry) => void;
const listeners = new Set<LogListener>();

// Generate unique ID
function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `log-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

// Get current timestamp in ISO format
function getTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Centralized logging service for NodLync
 * Aggregates logs from all services: frontend, backend, workers, integrations, AI modules
 */
class CentralLogService {
  private realtimeOptions: RealtimeLogOptions = { enabled: true, bufferSize: 100 };
  private sessionId: string;

  constructor() {
    this.sessionId = generateId();
  }

  /**
   * Subscribe to real-time log updates
   */
  subscribe(listener: LogListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  /**
   * Emit log to all subscribers
   */
  private emit(log: LogEntry): void {
    if (this.realtimeOptions.enabled) {
      listeners.forEach((listener) => {
        try {
          listener(log);
        } catch (e) {
          console.error("Error in log listener:", e);
        }
      });
    }
  }

  /**
   * Add log to in-memory buffer
   */
  private addToBuffer(log: LogEntry): void {
    memoryBuffer.unshift(log);
    if (memoryBuffer.length > MEMORY_BUFFER_SIZE) {
      memoryBuffer = memoryBuffer.slice(0, MEMORY_BUFFER_SIZE);
    }
  }

  /**
   * Create a log entry with full context
   */
  log(
    level: LogLevel,
    module: string,
    service: string,
    source: LogSource,
    message: string,
    metadata: LogMetadata = {},
    userId?: string,
    projectId?: string
  ): LogEntry {
    const entry: LogEntry = {
      id: generateId(),
      timestamp: getTimestamp(),
      level,
      module,
      service,
      source,
      message,
      metadata: {
        ...metadata,
        sessionId: this.sessionId,
      },
      userId,
      projectId,
      sessionId: this.sessionId,
    };

    this.addToBuffer(entry);
    this.emit(entry);

    // Also console log for development
    this.consoleLog(entry);

    return entry;
  }

  /**
   * Console output for development debugging
   */
  private consoleLog(entry: LogEntry): void {
    const prefix = `[${entry.level.toUpperCase()}] ${entry.module}.${entry.service}`;
    const styles: Record<LogLevel, string> = {
      debug: "color: #6b7280",
      info: "color: #3b82f6",
      warning: "color: #f59e0b",
      error: "color: #ef4444; font-weight: bold",
      fatal: "color: #dc2626; font-weight: bold; background: #fee2e2",
    };

    if (entry.level === "error" || entry.level === "fatal") {
      console.error(`%c${prefix}`, styles[entry.level], entry.message, entry.metadata);
    } else if (entry.level === "warning") {
      console.warn(`%c${prefix}`, styles[entry.level], entry.message, entry.metadata);
    } else if (entry.level === "debug") {
      console.debug(`%c${prefix}`, styles[entry.level], entry.message, entry.metadata);
    } else {
      console.log(`%c${prefix}`, styles[entry.level], entry.message, entry.metadata);
    }
  }

  // Convenience methods for different log levels
  debug(module: string, service: string, message: string, metadata?: LogMetadata, userId?: string, projectId?: string): LogEntry {
    return this.log("debug", module, service, "frontend", message, metadata, userId, projectId);
  }

  info(module: string, service: string, message: string, metadata?: LogMetadata, userId?: string, projectId?: string): LogEntry {
    return this.log("info", module, service, "frontend", message, metadata, userId, projectId);
  }

  warn(module: string, service: string, message: string, metadata?: LogMetadata, userId?: string, projectId?: string): LogEntry {
    return this.log("warning", module, service, "frontend", message, metadata, userId, projectId);
  }

  error(module: string, service: string, message: string, metadata?: LogMetadata, userId?: string, projectId?: string): LogEntry {
    return this.log("error", module, service, "frontend", message, metadata, userId, projectId);
  }

  fatal(module: string, service: string, message: string, metadata?: LogMetadata, userId?: string, projectId?: string): LogEntry {
    return this.log("fatal", module, service, "frontend", message, metadata, userId, projectId);
  }

  // Source-specific loggers
  backend(module: string, service: string, level: LogLevel, message: string, metadata?: LogMetadata, userId?: string, projectId?: string): LogEntry {
    return this.log(level, module, service, "backend", message, metadata, userId, projectId);
  }

  worker(module: string, service: string, level: LogLevel, message: string, metadata?: LogMetadata, userId?: string, projectId?: string): LogEntry {
    return this.log(level, module, service, "worker", message, metadata, userId, projectId);
  }

  integration(module: string, service: string, level: LogLevel, message: string, metadata?: LogMetadata, userId?: string, projectId?: string): LogEntry {
    return this.log(level, module, service, "integration", message, metadata, userId, projectId);
  }

  ai(module: string, service: string, level: LogLevel, message: string, metadata?: LogMetadata, userId?: string, projectId?: string): LogEntry {
    return this.log(level, module, service, "ai", message, metadata, userId, projectId);
  }

  system(module: string, service: string, level: LogLevel, message: string, metadata?: LogMetadata, userId?: string, projectId?: string): LogEntry {
    return this.log(level, module, service, "system", message, metadata, userId, projectId);
  }

  /**
   * Get logs from memory buffer
   */
  getBuffer(): LogEntry[] {
    return [...memoryBuffer];
  }

  /**
   * Clear memory buffer
   */
  clearBuffer(): void {
    memoryBuffer = [];
  }

  /**
   * Filter logs from buffer
   */
  filterLogs(filter: LogFilter): LogEntry[] {
    return memoryBuffer.filter((log) => this.matchesFilter(log, filter));
  }

  /**
   * Check if log entry matches filter criteria
   */
  private matchesFilter(log: LogEntry, filter: LogFilter): boolean {
    if (filter.level && filter.level !== "all" && log.level !== filter.level) return false;
    if (filter.module && log.module !== filter.module) return false;
    if (filter.service && log.service !== filter.service) return false;
    if (filter.source && filter.source !== "all" && log.source !== filter.source) return false;
    if (filter.userId && log.userId !== filter.userId) return false;
    if (filter.projectId && log.projectId !== filter.projectId) return false;

    if (filter.startTime) {
      const logTime = new Date(log.timestamp).getTime();
      if (logTime < filter.startTime.getTime()) return false;
    }

    if (filter.endTime) {
      const logTime = new Date(log.timestamp).getTime();
      if (logTime > filter.endTime.getTime()) return false;
    }

    if (filter.search || filter.searchQuery) {
      const query = (filter.search || filter.searchQuery || "").toLowerCase();
      return (
        log.message.toLowerCase().includes(query) ||
        log.module.toLowerCase().includes(query) ||
        log.service.toLowerCase().includes(query) ||
        JSON.stringify(log.metadata).toLowerCase().includes(query)
      );
    }

    return true;
  }

  /**
   * Get paginated logs from buffer
   */
  getPaginatedLogs(filter: LogFilter, options: LogPaginationOptions = {}): LogQueryResult {
    const pageSize = options.pageSize || 50;
    const page = options.page || 1;

    const filtered = this.filterLogs(filter);
    const totalCount = filtered.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const logs = filtered.slice(startIndex, endIndex);
    const hasMore = endIndex < totalCount;

    return {
      logs,
      totalCount,
      hasMore,
      nextCursor: hasMore ? String(page + 1) : undefined,
    };
  }

  /**
   * Get all unique modules from buffer
   */
  getUniqueModules(): string[] {
    const modules = new Set(memoryBuffer.map((log) => log.module));
    return Array.from(modules).sort();
  }

  /**
   * Get all unique services from buffer
   */
  getUniqueServices(): string[] {
    const services = new Set(memoryBuffer.map((log) => log.service));
    return Array.from(services).sort();
  }

  /**
   * Get all unique sources from buffer
   */
  getUniqueSources(): string[] {
    const sources = new Set(memoryBuffer.map((log) => log.source));
    return Array.from(sources).sort();
  }

  /**
   * Configure real-time options
   */
  configureRealtime(options: Partial<RealtimeLogOptions>): void {
    this.realtimeOptions = { ...this.realtimeOptions, ...options };
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }
}

// Export singleton instance
export const centralLog = new CentralLogService();

// Export class for testing or custom instances
export { CentralLogService };
