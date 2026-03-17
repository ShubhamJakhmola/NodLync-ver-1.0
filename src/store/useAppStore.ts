import { create } from "zustand";
import type { AppUser, Project } from "../types";

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
}

const useAppStore = create<AppState>((set, get) => ({
  user: null,
  projects: [],
  selectedProject: null,
  isCreateMode: true,
  projectsLoading: false,
  projectsError: null,
  setUser: (user) => set({ user }),
  setProjects: (projects) => {
    console.log("[Store] setProjects:", projects.length);
    set({ projects });
  },
  addProject: (project) =>
    set((state) => {
      console.log("[Store] addProject:", project.id);
      return { projects: [project, ...state.projects] };
    }),
  updateProject: (project) =>
    set((state) => {
      console.log("[Store] updateProject:", project.id);
      return {
        projects: state.projects.map((p) => (p.id === project.id ? project : p)),
        selectedProject:
          state.selectedProject?.id === project.id ? project : state.selectedProject,
      };
    }),
  removeProject: (id) =>
    set((state) => {
      console.log("[Store] removeProject:", id);
      return {
        projects: state.projects.filter((p) => p.id !== id),
        selectedProject:
          state.selectedProject?.id === id ? null : state.selectedProject,
      };
    }),
  setSelectedProject: (project) => {
    console.log("[Store] setSelectedProject:", project?.id ?? "null");
    set({ selectedProject: project, isCreateMode: false });
  },
  setIsCreateMode: (val) =>
    set(() => {
      console.log("[Store] setIsCreateMode:", val);
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
}));

export default useAppStore;
