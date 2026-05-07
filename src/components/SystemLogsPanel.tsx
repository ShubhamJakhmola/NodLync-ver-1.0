import { useEffect, useRef, useState, useCallback } from "react";
import type { LogEntry, LogFilter, LogLevel, LogSource } from "../types";
import { useLogStore } from "../store/useLogStore";
import useAppStore from "../store/useAppStore";
import { centralLog } from "../services/centralLogService";
import { clearLogs } from "../api/appLogsApi";
import PaginationControls from "./PaginationControls";

// Log level colors
const levelColors: Record<LogLevel, string> = {
  debug: "text-gray-400 bg-gray-400/10 border-gray-400/30",
  info: "text-blue-400 bg-blue-400/10 border-blue-400/30",
  warning: "text-amber-400 bg-amber-400/10 border-amber-400/30",
  error: "text-rose-400 bg-rose-400/10 border-rose-400/30",
  fatal: "text-red-600 bg-red-600/10 border-red-600/30 font-bold",
};

// Source icons
const sourceIcons: Record<LogSource, string> = {
  frontend: "🖥️",
  backend: "⚙️",
  worker: "🔧",
  integration: "🔗",
  ai: "🤖",
  system: "🔒",
};

interface LogFiltersProps {
  filter: LogFilter;
  availableModules: string[];
  availableServices: string[];
  onFilterChange: (filter: Partial<LogFilter>) => void;
  onReset: () => void;
}

function LogFilters({
  filter,
  availableModules,
  availableServices,
  onFilterChange,
  onReset,
}: LogFiltersProps) {
  const [searchQuery, setSearchQuery] = useState(filter.searchQuery || "");

  // Debounce search input
  useEffect(() => {
    const timeout = setTimeout(() => {
      onFilterChange({ searchQuery });
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, onFilterChange]);

  const hasActiveFilters =
    filter.level !== "all" ||
    filter.module ||
    filter.service ||
    filter.source !== "all" ||
    filter.searchQuery ||
    filter.startTime ||
    filter.endTime;

  return (
    <div className="space-y-3 p-4 bg-surface/50 border-b border-stroke">
      {/* Search and Quick Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-panel border border-stroke rounded-lg px-4 py-2 pl-9 text-sm focus:outline-none focus:border-primary"
          />
          <span className="absolute left-3 top-2.5 text-fg-muted">🔍</span>
        </div>

        <select
          value={filter.level || "all"}
          onChange={(e) => onFilterChange({ level: e.target.value as LogLevel | "all" })}
          className="bg-panel border border-stroke text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-primary"
        >
          <option value="all">All Levels</option>
          <option value="debug">Debug</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="error">Error</option>
          <option value="fatal">Fatal</option>
        </select>

        <select
          value={filter.source || "all"}
          onChange={(e) => onFilterChange({ source: e.target.value as LogSource | "all" })}
          className="bg-panel border border-stroke text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-primary"
        >
          <option value="all">All Sources</option>
          <option value="frontend">Frontend</option>
          <option value="backend">Backend</option>
          <option value="worker">Worker</option>
          <option value="integration">Integration</option>
          <option value="ai">AI</option>
          <option value="system">System</option>
        </select>

        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="btn-ghost text-xs px-3 py-2 text-fg-muted hover:text-rose-400"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Advanced Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={filter.module || "all"}
          onChange={(e) =>
            onFilterChange({ module: e.target.value === "all" ? undefined : e.target.value })
          }
          className="bg-panel border border-stroke text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-primary"
        >
          <option value="all">All Modules</option>
          {availableModules.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        <select
          value={filter.service || "all"}
          onChange={(e) =>
            onFilterChange({ service: e.target.value === "all" ? undefined : e.target.value })
          }
          className="bg-panel border border-stroke text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-primary"
        >
          <option value="all">All Services</option>
          {availableServices.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <input
          type="datetime-local"
          value={filter.startTime ? filter.startTime.toISOString().slice(0, 16) : ""}
          onChange={(e) =>
            onFilterChange({
              startTime: e.target.value ? new Date(e.target.value) : undefined,
            })
          }
          className="bg-panel border border-stroke text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-primary"
          placeholder="From"
        />
        <span className="text-fg-muted">→</span>
        <input
          type="datetime-local"
          value={filter.endTime ? filter.endTime.toISOString().slice(0, 16) : ""}
          onChange={(e) =>
            onFilterChange({
              endTime: e.target.value ? new Date(e.target.value) : undefined,
            })
          }
          className="bg-panel border border-stroke text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-primary"
          placeholder="To"
        />
      </div>
    </div>
  );
}

interface LogEntryRowProps {
  log: LogEntry;
  isExpanded: boolean;
  onToggle: () => void;
  showJson: boolean;
}

function LogEntryRow({ log, isExpanded, onToggle, showJson }: LogEntryRowProps) {
  const [showMetadata, setShowMetadata] = useState(false);

  const formattedTime = new Date(log.timestamp).toLocaleString();
  const levelClass = levelColors[log.level];

  return (
    <div
      className={`border-b border-stroke/50 transition-colors ${
        isExpanded ? "bg-surface/50" : "hover:bg-surface/30"
      }`}
    >
      <div
        onClick={onToggle}
        className="grid grid-cols-[auto,auto,auto,1fr,auto] gap-2 items-center p-3 cursor-pointer text-xs"
      >
        {/* Timestamp */}
        <span className="text-fg-muted font-mono whitespace-nowrap w-32">
          {formattedTime}
        </span>

        {/* Source Icon */}
        <span className="text-center w-6" title={`Source: ${log.source}`}>
          {sourceIcons[log.source]}
        </span>

        {/* Level Badge */}
        <span
          className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${levelClass} w-16 text-center`}
        >
          {log.level}
        </span>

        {/* Module.Service */}
        <span className="text-fg-muted truncate">
          <span className="text-primary font-medium">{log.module}</span>
          <span className="mx-1">.</span>
          <span>{log.service}</span>
        </span>

        {/* Expand Icon */}
        <span className="text-fg-muted">{isExpanded ? "▼" : "▶"}</span>
      </div>

      {/* Message and Metadata (when expanded) */}
      {isExpanded && (
        <div className="px-3 pb-3 pl-[152px]">
          <p className="text-sm text-fg-secondary mb-2 font-medium">{log.message}</p>

          {showJson ? (
            <pre className="bg-panel border border-stroke rounded-lg p-3 text-[10px] font-mono overflow-x-auto">
              {JSON.stringify(log, null, 2)}
            </pre>
          ) : (
            <>
              {Object.keys(log.metadata).length > 0 && (
                <div className="mt-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMetadata(!showMetadata);
                    }}
                    className="text-[10px] text-primary hover:underline mb-1"
                  >
                    {showMetadata ? "Hide Metadata ▲" : "Show Metadata ▼"}
                  </button>

                  {showMetadata && (
                    <div className="bg-panel border border-stroke rounded-lg p-3">
                      <table className="w-full text-[11px]">
                        <tbody>
                          {Object.entries(log.metadata).map(([key, value]) => (
                            <tr key={key} className="border-b border-stroke/30 last:border-0">
                              <td className="py-1 pr-4 text-fg-muted font-mono">{key}</td>
                              <td className="py-1 text-fg-secondary font-mono">
                                {typeof value === "object"
                                  ? JSON.stringify(value)
                                  : String(value)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Message Preview (when collapsed) */}
      {!isExpanded && (
        <div className="px-3 pb-2 pl-[152px]">
          <p className="text-xs text-fg-secondary truncate">{log.message}</p>
        </div>
      )}
    </div>
  );
}

interface SystemLogsPanelProps {
  userId?: string;
}

export default function SystemLogsPanel(_props: SystemLogsPanelProps) {
  const {
    filteredLogs,
    filter,
    pagination,
    isLiveMode,
    isLoading,
    error,
    expandedLogs,
    availableModules,
    availableServices,
    setFilter,
    resetFilter,
    setPage,
    setPageSize,
    toggleLiveMode,
    toggleExpandedLog,
    expandAllLogs,
    collapseAllLogs,
    fetchLogs,
    refreshLogs,
    exportLogs,
    clearLogs: clearLocalLogs,
    fetchAvailableOptions,
  } = useLogStore();

  const user = useAppStore((s) => s.user);
  const [showJson, setShowJson] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const initializedRef = useRef(false);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  // Subscribe to real-time logs
  useEffect(() => {
    const unsubscribe = centralLog.subscribe((log) => {
      useLogStore.getState().addLog(log);
    });

    return () => unsubscribe();
  }, []);

  // Initial fetch
  useEffect(() => {
    if (user?.id) {
      if (!initializedRef.current) {
        initializedRef.current = true;
        const now = Date.now();
        setFilter({
          startTime: new Date(now - 1000 * 60 * 60),
          endTime: undefined,
        });
        if (!isLiveMode) toggleLiveMode();
      }
      fetchLogs(user.id);
      fetchAvailableOptions(user.id);
    }
  }, [user?.id, fetchLogs, fetchAvailableOptions, isLiveMode, setFilter, toggleLiveMode]);

  // Auto-refresh when live mode is on
  useEffect(() => {
    if (!isLiveMode) return;

    const interval = setInterval(() => {
      if (user?.id) {
        refreshLogs(user.id);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isLiveMode, user?.id, refreshLogs]);

  const handleExport = useCallback(() => {
    const json = exportLogs();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nodlync-logs-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [exportLogs]);

  const handleClear = useCallback(async () => {
    if (!user?.id) return;

    setIsClearing(true);
    try {
      await clearLogs({ ...filter, userId: user.id });
      clearLocalLogs();
    } finally {
      setIsClearing(false);
    }
  }, [user?.id, clearLocalLogs, filter]);

  const handleFilterChange = useCallback(
    (newFilter: Partial<LogFilter>) => {
      setFilter(newFilter);
      if (user?.id) {
        refreshLogs(user.id);
      }
    },
    [setFilter, refreshLogs, user?.id]
  );

  const handleReset = useCallback(() => {
    resetFilter();
    if (user?.id) {
      refreshLogs(user.id);
    }
  }, [resetFilter, refreshLogs, user?.id]);

  return (
    <div className="glass-panel flex flex-col min-h-[500px] animate-in fade-in">
      {/* Header */}
      <div className="p-4 border-b border-stroke flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-fg-secondary">System Logs</h2>

          {/* Live Mode Toggle */}
          <button
            onClick={toggleLiveMode}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              isLiveMode
                ? "bg-emerald-400/20 text-emerald-400 border border-emerald-400/30"
                : "bg-surface text-fg-muted border border-stroke"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isLiveMode ? "bg-emerald-400 animate-pulse" : "bg-fg-muted"}`} />
            Live {isLiveMode ? "ON" : "OFF"}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-fg-muted">
            {pagination.totalCount} logs
            {isLoading && <span className="ml-2">Loading...</span>}
          </span>

          <button
            onClick={handleExport}
            className="btn-ghost text-xs font-bold px-3 py-1.5"
            title="Export logs as JSON"
          >
            Export JSON
          </button>

          <button
            onClick={handleClear}
            disabled={isClearing || filteredLogs.length === 0}
            className="btn-ghost text-rose-400 text-xs font-bold px-3 py-1.5 disabled:opacity-50"
          >
            {isClearing ? "Clearing..." : "Clear"}
          </button>
        </div>
      </div>

      {/* Filters */}
      <LogFilters
        filter={filter}
        availableModules={availableModules}
        availableServices={availableServices}
        onFilterChange={handleFilterChange}
        onReset={handleReset}
      />

      {/* Log Level Summary */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-stroke/50 bg-surface/20">
        {(["debug", "info", "warning", "error", "fatal"] as LogLevel[]).map((level) => (
          <span
            key={level}
            className={`text-[10px] px-2 py-0.5 rounded border ${levelColors[level]} cursor-pointer hover:opacity-80`}
            onClick={() => handleFilterChange({ level: filter.level === level ? "all" : level })}
          >
            {level.toUpperCase()}
          </span>
        ))}

        <div className="flex-1" />

        <button
          onClick={expandAllLogs}
          className="text-[10px] text-fg-muted hover:text-primary"
        >
          Expand All
        </button>
        <button
          onClick={collapseAllLogs}
          className="text-[10px] text-fg-muted hover:text-primary"
        >
          Collapse All
        </button>
        <button
          onClick={() => setShowJson(!showJson)}
          className={`text-[10px] px-2 py-0.5 rounded border ${
            showJson
              ? "bg-primary/20 text-primary border-primary/30"
              : "bg-surface text-fg-muted border-stroke"
          }`}
        >
          JSON
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-rose-400/10 border-b border-rose-400/30 text-rose-400 text-sm">
          Error: {error}
        </div>
      )}

      {/* Logs List */}
      <div
        ref={logsContainerRef}
        className="flex-1 overflow-y-auto custom-scrollbar min-h-[300px]"
      >
        {isLoading && filteredLogs.length === 0 ? (
          <div className="p-8 text-center">
            <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-fg-muted mt-2">Loading logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-sm text-fg-muted">
            {filter.level !== "all" ||
            filter.module ||
            filter.searchQuery ||
            filter.source !== "all"
              ? "No logs match your filters."
              : "No logs recorded yet."}
          </div>
        ) : (
          <div>
            {filteredLogs.map((log: LogEntry) => (
              <LogEntryRow
                key={log.id}
                log={log}
                isExpanded={expandedLogs.has(log.id)}
                onToggle={() => toggleExpandedLog(log.id)}
                showJson={showJson}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {filteredLogs.length > 0 && (
        <div className="p-3 border-t border-stroke bg-surface/20">
          <PaginationControls
            currentPage={pagination.page}
            pageSize={pagination.pageSize}
            totalPages={Math.ceil(pagination.totalCount / pagination.pageSize)}
            totalItems={pagination.totalCount}
            startItem={Math.min(
              (pagination.page - 1) * pagination.pageSize + 1,
              pagination.totalCount
            )}
            endItem={Math.min(pagination.page * pagination.pageSize, pagination.totalCount)}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            itemLabel="logs"
          />
        </div>
      )}
    </div>
  );
}
