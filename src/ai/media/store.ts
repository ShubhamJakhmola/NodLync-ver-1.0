/**
 * NodLync Media Job Store (Zustand)
 *
 * Manages the state of all media generation jobs:
 * active queue, history, and UI state for the media tabs.
 */

import { create } from "zustand";
import type { MediaJob, MediaModality } from "./types";

export interface MediaStoreState {
  /** All jobs (active + completed). Most recent first. */
  jobs: MediaJob[];

  /** Currently selected modality tab. */
  activeModality: MediaModality;

  /** Prompt input for the current modality. */
  prompt: string;

  /** Selected API key ID. */
  apiId: string;

  /** Selected model. */
  model: string;

  // ── Actions ──

  setActiveModality: (modality: MediaModality) => void;
  setPrompt: (prompt: string) => void;
  setApiId: (apiId: string) => void;
  setModel: (model: string) => void;

  /** Add or update a job in the store. */
  upsertJob: (job: MediaJob) => void;

  /** Remove a job from history. */
  removeJob: (jobId: string) => void;

  /** Clear all completed/failed jobs. */
  clearHistory: () => void;

  /** Cancel a job (marks as cancelled). */
  cancelJob: (jobId: string) => void;
}

const useMediaStore = create<MediaStoreState>((set) => ({
  jobs: [],
  activeModality: "image",
  prompt: "",
  apiId: "",
  model: "",

  setActiveModality: (modality) => set({ activeModality: modality }),
  setPrompt: (prompt) => set({ prompt }),
  setApiId: (apiId) => set({ apiId }),
  setModel: (model) => set({ model }),

  upsertJob: (job) =>
    set((state) => {
      const existing = state.jobs.findIndex((j) => j.id === job.id);
      if (existing >= 0) {
        const next = [...state.jobs];
        next[existing] = job;
        return { jobs: next };
      }
      return { jobs: [job, ...state.jobs] };
    }),

  removeJob: (jobId) =>
    set((state) => ({
      jobs: state.jobs.filter((j) => j.id !== jobId),
    })),

  clearHistory: () =>
    set((state) => ({
      jobs: state.jobs.filter(
        (j) => j.status === "queued" || j.status === "generating" || j.status === "polling",
      ),
    })),

  cancelJob: (jobId) =>
    set((state) => ({
      jobs: state.jobs.map((j) =>
        j.id === jobId && ["queued", "generating", "polling"].includes(j.status)
          ? { ...j, status: "cancelled" as const, updatedAt: new Date() }
          : j,
      ),
    })),
}));

export default useMediaStore;
