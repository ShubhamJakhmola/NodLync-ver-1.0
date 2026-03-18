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
  const [bulkDeleting, setBulkDeleting] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }
    const load = async () => {
      setProjectsLoading(true);
      setProjectsError(null);
      const { data, error } = await getProjects(user.id);
      if (error) {
        setProjectsError(error.message);
      } else {
        const list = data ?? [];
        setProjects(list);
        if (list.length === 0) {
          setIsCreateMode(true);
        } else {
          setSelectedProject(list[0]);
          setIsCreateMode(false);
        }
      }
      setProjectsLoading(false);
    };
    load();
  }, [user, setProjectsLoading, setProjects, setProjectsError, setIsCreateMode, setSelectedProject]);

  const handleCreateProject = async (payload: {
    name: string;
    description: string;
    status: ProjectStatus;
  }) => {
    if (!user) return;
    setFormBusy(true);
    setProjectsError(null);
    const { data, error } = await createProject({
      ...payload,
      user_id: user.id,
    });
    if (error) {
      setProjectsError(error.message);
    } else if (data) {
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
    setFormBusy(true);
    setProjectsError(null);
    const { data, error } = await updateProject(selectedProject.id, payload);
    if (error) {
      setProjectsError(error.message);
    } else if (data) {
      updateProjectState(data);
    }
    setFormBusy(false);
  };

  const handleDeleteProject = async () => {
    if (!selectedProject) return;
    const nextProject = projects.find((p) => p.id !== selectedProject.id);
    setFormBusy(true);
    setProjectsError(null);
    const { error } = await deleteProject(selectedProject.id);
    if (error) {
      setProjectsError(error.message);
    } else {
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

  const handleBulkDeleteProjects = async (ids: string[]) => {
    setBulkDeleting(true);
    setProjectsError(null);
    const results = await Promise.all(ids.map((id) => deleteProject(id)));
    const failed = results.find((result) => result.error);
    if (failed?.error) {
      setProjectsError(failed.error.message);
      setBulkDeleting(false);
      return;
    }

    ids.forEach((id) => removeProject(id));
    if (selectedProject && ids.includes(selectedProject.id)) {
      const remaining = projects.filter((project) => !ids.includes(project.id));
      if (remaining.length > 0) {
        setSelectedProject(remaining[0]);
        setIsCreateMode(false);
      } else {
        setSelectedProject(null);
        setIsCreateMode(true);
      }
    }
    setBulkDeleting(false);
  };

  const handleSelectProject = (project: typeof selectedProject) => {
    if (!project) return;
    setProjectsError(null);
    setSelectedProject(project);
    setIsCreateMode(false);
  };

  const handleCreateMode = () => {
    setProjectsError(null);
    setIsCreateMode(true);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[300px,1fr] gap-6 h-full min-h-[600px]">
      <ProjectList
        projects={projects}
        selectedId={isCreateMode ? undefined : selectedProject?.id}
        onSelect={handleSelectProject}
        onCreate={handleCreateMode}
        onDeleteSelected={handleBulkDeleteProjects}
        loading={projectsLoading}
        bulkDeleting={bulkDeleting}
      />

      <div className="flex flex-col gap-4">
        {projectsError && (
          <div className="glass-panel border border-rose-800 bg-rose-900/40 px-4 py-3 text-sm text-rose-100 flex items-center gap-2">
            <span>Warning</span>
            <span>{projectsError}</span>
          </div>
        )}

        <ProjectForm
          mode={isCreateMode || !selectedProject ? "create" : "edit"}
          initial={isCreateMode ? null : selectedProject}
          onSubmit={isCreateMode || !selectedProject ? handleCreateProject : handleUpdateProject}
          onDelete={!isCreateMode && selectedProject ? handleDeleteProject : undefined}
          onCancel={
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

        {!isCreateMode && selectedProject && (
          <div className="glass-panel p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Created</p>
              <p className="text-sm font-medium text-slate-200">
                {formatDateTime(selectedProject.created_at ?? "")}
              </p>
            </div>
            {selectedProject.updated_at && (
              <div className="text-right">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Last Updated</p>
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

