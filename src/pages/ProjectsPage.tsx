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
      console.log("[ProjectsPage] Load result:", { count: data?.length ?? 0, hasError: !!error });
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
          console.log("[ProjectsPage] Selecting first project:", list[0].id);
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

  const handleUpdateProject = async (payload: {
    name: string;
    description: string;
    status: ProjectStatus;
  }) => {
    if (!selectedProject) return;
    console.log("[ProjectsPage] Updating project:", selectedProject.id, payload);
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

  const handleDeleteProject = async () => {
    if (!selectedProject) return;
    const nextProject = projects.find((p) => p.id !== selectedProject.id);
    console.log("[ProjectsPage] Deleting project:", selectedProject.id, "next:", nextProject?.id ?? "none");
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
        setIsCreateMode(true);
      }
    }
    setFormBusy(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px,1fr] gap-6">
      <ProjectList
        projects={projects}
        selectedId={selectedProject?.id}
        onSelect={(proj) => setSelectedProject(proj)}
        onCreate={() => setIsCreateMode(true)}
        loading={projectsLoading}
      />

      <div className="flex flex-col gap-4">
        {projectsError && (
          <div className="glass-panel border border-rose-800 bg-rose-900/40 px-4 py-3 text-sm text-rose-100">
            {projectsError}
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
          onDelete={!isCreateMode ? handleDeleteProject : undefined}
          onCancel={() => setIsCreateMode(false)}
          busy={formBusy}
          error={projectsError ?? undefined}
        />
        {!isCreateMode && selectedProject && (
          <div className="glass-panel p-4">
            <p className="text-sm text-slate-400">Created</p>
            <p className="text-lg font-semibold">
              {formatDateTime(selectedProject.created_at)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectsPage;
