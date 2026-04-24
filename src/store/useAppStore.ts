import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AppSettings, AppUser, Project, SystemLogEntry, UserProfile } from "../types";

interface AppState {
  user: AppUser | null;
  projects: Project[];
  selectedProject: Project | null;
  isCreateMode: boolean;
  projectsLoading: boolean;
  projectsError: string | null;
  setUser: (user: AppUser | null) => void;
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  updateProject: (project: Project) => void;
  removeProject: (id: string) => void;
  setSelectedProject: (project: Project | null) => void;
  setIsCreateMode: (val: boolean) => void;
  setProjectsLoading: (val: boolean) => void;
  setProjectsError: (val: string | null) => void;
  resetProjects: () => void;

  // New states for User Preferences
  userProfile: UserProfile | null;
  appSettings: AppSettings | null;
  appLogs: SystemLogEntry[];
  setUserProfile: (profile: UserProfile | null) => void;
  setAppSettings: (settings: AppSettings | null) => void;
  setAppLogs: (logs: SystemLogEntry[]) => void;
  addAppLog: (log: SystemLogEntry) => void;

  // Persistent Auth states
  hasAgreedTerms: boolean;
  setHasAgreedTerms: (val: boolean) => void;
}

const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
  user: null,
  projects: [],
  selectedProject: null,
  isCreateMode: true,
  projectsLoading: false,
  projectsError: null,
  setUser: (user) => set({ user }),
  setProjects: (projects) => {
    set({ projects });
  },
  addProject: (project) =>
    set((state) => {
      return { projects: [project, ...state.projects] };
    }),
  updateProject: (project) =>
    set((state) => {
      return {
        projects: state.projects.map((p) => (p.id === project.id ? project : p)),
        selectedProject:
          state.selectedProject?.id === project.id ? project : state.selectedProject,
      };
    }),
  removeProject: (id) =>
    set((state) => {
      return {
        projects: state.projects.filter((p) => p.id !== id),
        selectedProject:
          state.selectedProject?.id === id ? null : state.selectedProject,
      };
    }),
  setSelectedProject: (project) => {
    set({ selectedProject: project, isCreateMode: false });
  },
  setIsCreateMode: (val) =>
    set(() => {
      return {
        isCreateMode: val,
        selectedProject: val ? null : get().selectedProject,
      };
    }),
  setProjectsLoading: (val) => set({ projectsLoading: val }),
  setProjectsError: (val) => set({ projectsError: val }),
  resetProjects: () =>
    set({
      projects: [],
      selectedProject: null,
      isCreateMode: true,
      projectsError: null,
      projectsLoading: false,
    }),

  userProfile: null,
  appSettings: null,
  appLogs: [],
  setUserProfile: (userProfile) => set({ userProfile }),
  setAppSettings: (appSettings) => set({ appSettings }),
  setAppLogs: (appLogs) => set({ appLogs }),
  addAppLog: (log) =>
    set((state) => ({ appLogs: [log, ...state.appLogs].slice(0, 200) })),

  hasAgreedTerms: false,
  setHasAgreedTerms: (hasAgreedTerms) => set({ hasAgreedTerms }),
    }),
    {
      name: "nodlync-app-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        projects: state.projects,
        selectedProject: state.selectedProject,
        isCreateMode: state.isCreateMode,
        userProfile: state.userProfile,
        appSettings: state.appSettings,
        appLogs: state.appLogs,
        hasAgreedTerms: state.hasAgreedTerms,
      }),
    }
  )
);

export default useAppStore;
