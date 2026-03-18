import { useEffect, useState } from "react";
import {
  createProject,
  deleteProject,
  getProjects,
  updateProject,
} from "../api/projectsApi";
import ProjectForm from "../modules/projects/ProjectForm";
import ProjectList from "../modules/projects/ProjectList";
import useAppStore from "../store/useAppStore";
import type { ProjectStatus } from "../types";
import { formatDateTime } from "../utils/format";

const ProjectsPage = () => {
  const {
    user,
    projects,
    selectedProject,
    isCreateMode,
    setProjects,
    addProject,
    updateProject: updateProjectState,
    removeProject,
    setSelectedProject,
    setIsCreateMode,
    projectsLoading,
    projectsError,
    setProjectsLoading,
    setProjectsError,
  } = useAppStore();
  const [formBusy, setFormBusy] = useState(false);

  // Load projects on mount / user change
  useEffect(() => {
    if (!user) {
      console.log("[ProjectsPage] No user, skipping load");
      return;
    }
    console.log("[ProjectsPage] Loading projects for user:", user.id);
    const load = async () => {
      setProjectsLoading(true);
      setProjectsError(null);
      const { data, error } = await getProjects(user.id);
      console.log("[ProjectsPage] Load result:", {
        count: data?.length ?? 0,
        hasError: !!error,
      });
      if (error) {
        console.error("[ProjectsPage] Load error:", error.message);
        setProjectsError(error.message);
      } else {
        const list = data ?? [];
        console.log("[ProjectsPage] Setting projects:", list.length);
        setProjects(list);
        if (list.length === 0) {
          console.log("[ProjectsPage] No projects, switching to create mode");
          setIsCreateMode(true);
        } else {
          console.log(
            "[ProjectsPage] Selecting first project:",
            list[0].id
          );
          setSelectedProject(list[0]);
          setIsCreateMode(false);
        }
      }
      setProjectsLoading(false);
    };
    load();
  }, [
    user,
    setProjectsLoading,
    setProjects,
    setProjectsError,
    setIsCreateMode,
    setSelectedProject,
  ]);

  // ── Create ──────────────────────────────────────────────────────────────
  const handleCreateProject = async (payload: {
    name: string;
    description: string;
    status: ProjectStatus;
  }) => {
    if (!user) return;
    console.log("[ProjectsPage] Creating project:", payload);
    setFormBusy(true);
    setProjectsError(null);
    const { data, error } = await createProject({
      ...payload,
      user_id: user.id,
    });
    if (error) {
      console.error("[ProjectsPage] Create error:", error.message);
      setProjectsError(error.message);
    } else if (data) {
      console.log("[ProjectsPage] Project created:", data.id);
      addProject(data);
      setSelectedProject(data);
      setIsCreateMode(false);
    }
    setFormBusy(false);
  };

  // ── Update ──────────────────────────────────────────────────────────────
  const handleUpdateProject = async (payload: {
    name: string;
    description: string;
    status: ProjectStatus;
  }) => {
    if (!selectedProject) return;
    console.log(
      "[ProjectsPage] Updating project:",
      selectedProject.id,
      payload
    );
    setFormBusy(true);
    setProjectsError(null);
    const { data, error } = await updateProject(selectedProject.id, payload);
    if (error) {
      console.error("[ProjectsPage] Update error:", error.message);
      setProjectsError(error.message);
    } else if (data) {
      console.log("[ProjectsPage] Project updated:", data.id);
      updateProjectState(data);
    }
    setFormBusy(false);
  };

  // ── Delete ──────────────────────────────────────────────────────────────
  const handleDeleteProject = async () => {
    if (!selectedProject) return;
    const nextProject = projects.find((p) => p.id !== selectedProject.id);
    console.log(
      "[ProjectsPage] Deleting project:",
      selectedProject.id,
      "next:",
      nextProject?.id ?? "none"
    );
    setFormBusy(true);
    setProjectsError(null);
    const { error } = await deleteProject(selectedProject.id);
    if (error) {
      console.error("[ProjectsPage] Delete error:", error.message);
      setProjectsError(error.message);
    } else {
      console.log("[ProjectsPage] Project deleted successfully");
      removeProject(selectedProject.id);
      if (nextProject) {
        setSelectedProject(nextProject);
        setIsCreateMode(false);
      } else {
        setSelectedProject(null);
        setIsCreateMode(true);
      }
    }
    setFormBusy(false);
  };

  // ── Select project from list ────────────────────────────────────────────
  const handleSelectProject = (project: typeof selectedProject) => {
    if (!project) return;
    setProjectsError(null);
    setSelectedProject(project);
    setIsCreateMode(false);
  };

  // ── New project ─────────────────────────────────────────────────────────
  const handleCreateMode = () => {
    setProjectsError(null);
    setIsCreateMode(true);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[300px,1fr] gap-6 h-full min-h-[600px]">
      {/* Left panel: project list */}
      <ProjectList
        projects={projects}
        selectedId={isCreateMode ? undefined : selectedProject?.id}
        onSelect={handleSelectProject}
        onCreate={handleCreateMode}
        loading={projectsLoading}
      />

      {/* Right panel: always visible */}
      <div className="flex flex-col gap-4">
        {projectsError && (
          <div className="glass-panel border border-rose-800 bg-rose-900/40 px-4 py-3 text-sm text-rose-100 flex items-center gap-2">
            <span>⚠️</span>
            <span>{projectsError}</span>
          </div>
        )}

        <ProjectForm
          mode={isCreateMode || !selectedProject ? "create" : "edit"}
          initial={isCreateMode ? null : selectedProject}
          onSubmit={
            isCreateMode || !selectedProject
              ? handleCreateProject
              : handleUpdateProject
          }
          onDelete={!isCreateMode && selectedProject ? handleDeleteProject : undefined}
          onCancel={
            // Only show cancel in create mode when there are existing projects
            isCreateMode && projects.length > 0
              ? () => {
                  setIsCreateMode(false);
                  if (selectedProject) setSelectedProject(selectedProject);
                  else if (projects.length > 0) setSelectedProject(projects[0]);
                }
              : undefined
          }
          busy={formBusy}
          error={projectsError ?? undefined}
        />

        {/* Created at metadata for selected project */}
        {!isCreateMode && selectedProject && (
          <div className="glass-panel p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">
                Created
              </p>
              <p className="text-sm font-medium text-slate-200">
                {formatDateTime(selectedProject.created_at ?? "")}
              </p>
            </div>
            {selectedProject.updated_at && (
              <div className="text-right">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">
                  Last Updated
                </p>
                <p className="text-sm font-medium text-slate-200">
                  {formatDateTime(selectedProject.updated_at)}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectsPage;
