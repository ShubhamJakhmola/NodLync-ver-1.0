import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ChatMessage } from "../api/aiPlaygroundApi";

export type PlaygroundTabId = "chat" | "ideas" | "research" | "media";

export interface PlaygroundIdeaItem {
  id: string;
  title: string;
  description: string;
}

export type PlaygroundColumnStatus = "idle" | "loading" | "success" | "error";

export interface PlaygroundModelRunState {
  id: string;
  status: PlaygroundColumnStatus;
  response: string;
  error: string | null;
}

export interface PlaygroundResearchColumn {
  id: string;
  apiId: string;
  model: string;
  status: PlaygroundColumnStatus;
  response: string;
  error: string | null;
  runToken?: string;
  debug?: Record<string, unknown> | null;
}

export interface PlaygroundChatState {
  apiId: string;
  model: string;
  messages: ChatMessage[];
  input: string;
  error: string | null;
  lastDebug: Record<string, unknown> | null;
  mode: "chat" | "research" | "image" | "video" | "audio" | "code";
}

export interface PlaygroundIdeasState {
  apiId: string;
  model: string;
  context: string;
  ideas: PlaygroundIdeaItem[];
  error: string | null;
  lastDebug: Record<string, unknown> | null;
}

export interface PlaygroundResearchState {
  prompt: string;
  columns: PlaygroundResearchColumn[];
  summaryApiId: string;
  summaryModel: string;
  summary: string;
  summaryError: string | null;
  lastDebug: Record<string, unknown> | null;
}

export interface PlaygroundState {
  ownerUserId: string | null;
  activeTab: PlaygroundTabId;
  chat: PlaygroundChatState;
  ideas: PlaygroundIdeasState;
  research: PlaygroundResearchState;
  hydrateForUser: (userId: string | null) => void;
  setActiveTab: (tab: PlaygroundTabId) => void;
  setChat: (patch: Partial<PlaygroundChatState>) => void;
  setIdeas: (patch: Partial<PlaygroundIdeasState>) => void;
  setResearch: (patch: Partial<PlaygroundResearchState>) => void;
  reset: () => void;
}

const defaultChatState: PlaygroundChatState = {
  apiId: "",
  model: "",
  messages: [],
  input: "",
  error: null,
  lastDebug: null,
  mode: "chat",
};

const defaultIdeasState: PlaygroundIdeasState = {
  apiId: "",
  model: "",
  context: "",
  ideas: [],
  error: null,
  lastDebug: null,
};

const defaultResearchState: PlaygroundResearchState = {
  prompt: "",
  columns: [],
  summaryApiId: "",
  summaryModel: "",
  summary: "",
  summaryError: null,
  lastDebug: null,
};

const initialState = {
  ownerUserId: null,
  activeTab: "chat" as PlaygroundTabId,
  chat: defaultChatState,
  ideas: defaultIdeasState,
  research: defaultResearchState,
};

const usePlaygroundStore = create<PlaygroundState>()(
  persist(
    (set, get) => ({
      ...initialState,
      hydrateForUser: (userId) => {
        const current = get().ownerUserId;
        if (current !== userId) {
          set({
            ...initialState,
            ownerUserId: userId,
          });
        }
      },
      setActiveTab: (tab) => set({ activeTab: tab }),
      setChat: (patch) => set((state) => ({ chat: { ...state.chat, ...patch } })),
      setIdeas: (patch) => set((state) => ({ ideas: { ...state.ideas, ...patch } })),
      setResearch: (patch) => set((state) => ({ research: { ...state.research, ...patch } })),
      reset: () => set({ ...initialState, ownerUserId: get().ownerUserId }),
    }),
    {
      name: "nodlync-playground-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        ownerUserId: state.ownerUserId,
        activeTab: state.activeTab,
        chat: state.chat,
        ideas: state.ideas,
        research: state.research,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.chat.error = null;
        state.research.summaryError = null;
        state.research.columns = state.research.columns.map((col) => ({
          ...col,
          status: col.status === "loading" ? "idle" : col.status,
          runToken: undefined,
        }));
      },
    }
  )
);

export default usePlaygroundStore;
