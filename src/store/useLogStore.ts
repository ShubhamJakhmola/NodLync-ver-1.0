import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  LogEntry,
  LogFilter,
  RealtimeLogOptions,
} from "../types";
import { centralLog } from "../services/centralLogService";
import { queryLogs, getUniqueLogModules, getUniqueLogServices } from "../api/appLogsApi";

interface LogState {
  // Logs data
  logs: LogEntry[];
  filteredLogs: LogEntry[];
  
  // Filtering
  filter: LogFilter;
  
  // Pagination
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    hasMore: boolean;
  };
  
  // UI state
  isLoading: boolean;
  error: string | null;
  isLiveMode: boolean;
  expandedLogs: Set<string>;
  
  // Available options
  availableModules: string[];
  availableServices: string[];
  
  // Real-time options
  realtimeOptions: RealtimeLogOptions;
}

interface LogActions {
  // Basic operations
  setLogs: (logs: LogEntry[]) => void;
  addLog: (log: LogEntry) => void;
  removeLog: (id: string) => void;
  clearLogs: () => void;
  
  // Filtering
  setFilter: (filter: Partial<LogFilter>) => void;
  applyFilters: () => void;
  resetFilter: () => void;
  
  // Pagination
  setPagination: (pagination: Partial<LogState['pagination']>) => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  
  // UI state
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setLiveMode: (enabled: boolean) => void;
  toggleLiveMode: () => void;
  toggleLogExpanded: (id: string) => void;
  toggleExpandedLog: (id: string) => void;
  expandAllLogs: () => void;
  collapseAllLogs: () => void;
  
  // Data fetching
  fetchLogs: (userId: string) => Promise<void>;
  refreshLogs: (userId: string) => Promise<void>;
  loadMoreLogs: () => Promise<void>;
  
  // Available options
  setAvailableModules: (modules: string[]) => void;
  setAvailableServices: (services: string[]) => void;
  fetchAvailableOptions: (userId?: string) => Promise<void>;
  
  // Real-time
  setRealtimeOptions: (options: Partial<RealtimeLogOptions>) => void;
  startRealtime: () => void;
  stopRealtime: () => void;
  
  // Utility
  exportLogs: () => string;
}

type LogStore = LogState & LogActions;

const initialFilter: LogFilter = {
  level: "all",
  module: "",
  service: "",
  source: "all",
  searchQuery: "",
  startTime: undefined,
  endTime: undefined,
};

const initialPagination = {
  page: 1,
  pageSize: 50,
  totalCount: 0,
  hasMore: false,
};

const initialRealtimeOptions: RealtimeLogOptions = {
  enabled: false,
  bufferSize: 1000,
};

export const useLogStore = create<LogStore>()(
  persist(
    (set, get) => ({
      // Initial state
      logs: [],
      filteredLogs: [],
      filter: initialFilter,
      pagination: initialPagination,
      isLoading: false,
      error: null,
      isLiveMode: false,
      expandedLogs: new Set(),
      availableModules: [],
      availableServices: [],
      realtimeOptions: initialRealtimeOptions,

      // Basic operations
      setLogs: (logs) => {
        set({ logs });
        get().applyFilters();
      },

      addLog: (log) => {
        set((state) => {
          const newLogs = [log, ...state.logs].slice(0, 1000);
          return { logs: newLogs };
        });
        get().applyFilters();
      },

      removeLog: (id) => {
        set((state) => ({
          logs: state.logs.filter((log) => log.id !== id),
        }));
        get().applyFilters();
      },

      clearLogs: () => {
        set({ logs: [], filteredLogs: [] });
      },

      // Filtering
      setFilter: (newFilter) => {
        set((state) => ({
          filter: { ...state.filter, ...newFilter },
        }));
        get().applyFilters();
      },

      resetFilter: () => {
        set({ filter: initialFilter });
        get().applyFilters();
      },

      applyFilters: () => {
        const { logs, filter, pagination } = get();
        let filtered = [...logs];

        // Apply level filter
        if (filter.level && filter.level !== "all") {
          filtered = filtered.filter((log) => log.level === filter.level);
        }

        // Apply module filter
        if (filter.module) {
          filtered = filtered.filter((log) => log.module === filter.module);
        }

        // Apply service filter
        if (filter.service) {
          filtered = filtered.filter((log) => log.service === filter.service);
        }

        // Apply source filter
        if (filter.source && filter.source !== "all") {
          filtered = filtered.filter((log) => log.source === filter.source);
        }

        // Apply search filter
        if (filter.searchQuery) {
          const query = filter.searchQuery.toLowerCase();
          filtered = filtered.filter((log) => {
            const searchable = `${log.message} ${log.module} ${log.service} ${JSON.stringify(log.metadata)}`.toLowerCase();
            return searchable.includes(query);
          });
        }

        // Apply time range
        if (filter.startTime) {
          const start = filter.startTime.getTime();
          filtered = filtered.filter((log) => new Date(log.timestamp).getTime() >= start);
        }

        if (filter.endTime) {
          const end = filter.endTime.getTime();
          filtered = filtered.filter((log) => new Date(log.timestamp).getTime() <= end);
        }

        // Apply pagination
        const startIndex = (pagination.page - 1) * pagination.pageSize;
        const endIndex = startIndex + pagination.pageSize;
        const paginated = filtered.slice(startIndex, endIndex);

        set({
          filteredLogs: paginated,
          pagination: {
            ...pagination,
            totalCount: filtered.length,
            hasMore: endIndex < filtered.length,
          },
        });
      },

      // Pagination
      setPagination: (newPagination) => {
        set((state) => ({
          pagination: { ...state.pagination, ...newPagination },
        }));
        get().applyFilters();
      },

      setPage: (page) => {
        set((state) => ({
          pagination: { ...state.pagination, page },
        }));
        get().applyFilters();
      },

      setPageSize: (pageSize) => {
        set((state) => ({
          pagination: { ...state.pagination, pageSize, page: 1 },
        }));
        get().applyFilters();
      },

      // UI state
      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error }),

      setLiveMode: (enabled) => {
        set({ isLiveMode: enabled });
        if (enabled) {
          get().startRealtime();
        } else {
          get().stopRealtime();
        }
      },

      toggleLiveMode: () => {
        const { isLiveMode } = get();
        get().setLiveMode(!isLiveMode);
      },

      toggleLogExpanded: (id) => {
        set((state) => {
          const expanded = new Set(state.expandedLogs);
          if (expanded.has(id)) {
            expanded.delete(id);
          } else {
            expanded.add(id);
          }
          return { expandedLogs: expanded };
        });
      },

      toggleExpandedLog: (id) => {
        get().toggleLogExpanded(id);
      },

      expandAllLogs: () => {
        const { filteredLogs } = get();
        set({
          expandedLogs: new Set(filteredLogs.map(log => log.id)),
        });
      },

      collapseAllLogs: () => {
        set({ expandedLogs: new Set() });
      },

      // Data fetching
      fetchLogs: async (userId) => {
        set({ isLoading: true, error: null });
        try {
          const result = await queryLogs({ userId });
          
          set({
            logs: result.logs,
            filteredLogs: result.logs,
            pagination: {
              page: result.page,
              pageSize: result.pageSize,
              totalCount: result.total,
              hasMore: result.hasMore,
            },
            isLoading: false,
          });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to fetch logs', 
            isLoading: false 
          });
        }
      },

      refreshLogs: async (userId) => {
        set((state) => ({ pagination: { ...state.pagination, page: 1 } }));
        await get().fetchLogs(userId);
      },

      loadMoreLogs: async () => {
        const { pagination, filter, logs } = get();
        if (!pagination.hasMore) return;

        set({ isLoading: true });
        try {
          const result = await queryLogs(filter, {
            page: pagination.page + 1,
            pageSize: pagination.pageSize,
          });

          set({
            logs: [...logs, ...result.logs],
            filteredLogs: [...logs, ...result.logs],
            pagination: {
              ...pagination,
              page: pagination.page + 1,
              hasMore: result.hasMore,
            },
          });
        } catch (err) {
          set({ error: err instanceof Error ? err.message : "Failed to load more logs" });
        } finally {
          set({ isLoading: false });
        }
      },

      // Available options
      setAvailableModules: (modules) => set({ availableModules: modules }),

      setAvailableServices: (services) => set({ availableServices: services }),

      fetchAvailableOptions: async (userId) => {
        try {
          const [modules, services] = await Promise.all([
            getUniqueLogModules(userId),
            getUniqueLogServices(userId),
          ]);
          
          set({
            availableModules: modules,
            availableServices: services,
          });
        } catch (error) {
          console.error("Failed to fetch available options:", error);
        }
      },

      // Real-time
      setRealtimeOptions: (options) => {
        set((state) => ({
          realtimeOptions: { ...state.realtimeOptions, ...options },
        }));
      },

      startRealtime: () => {
        const { filter } = get();
        
        // For now, just enable real-time mode
        // The actual real-time updates will be handled by the component
        centralLog.log("info", "store", "realtime", "system", "Real-time logging started", { filter });
      },

      stopRealtime: () => {
        centralLog.log("info", "store", "realtime", "system", "Real-time logging stopped");
      },

      // Utility
      exportLogs: () => {
        const { filteredLogs } = get();
        return JSON.stringify(filteredLogs, null, 2);
      },
    }),
    {
      name: "log-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        filter: state.filter,
        isLiveMode: state.realtimeOptions.enabled,
        expandedLogs: Array.from(state.expandedLogs),
        availableModules: state.availableModules,
        availableServices: state.availableServices,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Convert array back to Set
          state.expandedLogs = new Set(state.expandedLogs as unknown as string[]);
          
          // Restore real-time options
          state.realtimeOptions = {
            ...initialRealtimeOptions,
            enabled: state.isLiveMode,
          };
          
          // Apply filters to reinitialize filteredLogs
          state.applyFilters();
        }
      },
    }
  )
);
