import { useEffect, useState } from "react";
import ProjectCreateModal from "../modules/projects/ProjectCreateModal";
import ProjectForm from "../modules/projects/ProjectForm";
import ProjectList from "../modules/projects/ProjectList";
import DailySummaryModal from "../modules/projects/DailySummaryModal";
import ModuleHeader from "../components/ModuleHeader";
import { useProjects } from "../hooks/useProjects";
import { logAppEvent } from "../utils/appLogger";
import type { ProjectStatus } from "../types";

const ProjectsPage = () => {
  const {
    projects,
    loading,
    error,
    selectedProject,
    fetchProjects,
    handleCreate,
    handleUpdate,
    handleDelete,
    setSelectedProject,
    user,
  } = useProjects();

  const [formBusy, setFormBusy] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Log projects page view
  useEffect(() => {
    if (user && projects.length > 0) {
      void logAppEvent({
        type: "info",
        module: "projects",
        message: `Viewed projects page with ${projects.length} projects`,
        meta: { projectCount: projects.length },
      });
    }
  }, [user, projects.length]);

  const onAddProject = async (payload: {
    name: string;
    description: string;
    status: ProjectStatus;
  }) => {
    setFormBusy(true);
    try {
      await handleCreate(payload);
      await logAppEvent({
        type: "success",
        module: "projects",
        message: `Created project: ${payload.name}`,
        meta: { name: payload.name, status: payload.status },
      });
      setShowCreateModal(false);
    } catch (error) {
      await logAppEvent({
        type: "error",
        module: "projects",
        message: `Failed to create project: ${payload.name}`,
        meta: { error, name: payload.name },
      });
    } finally {
      setFormBusy(false);
    }
  };

  const onEditProject = async (payload: {
    name: string;
    description: string;
    status: ProjectStatus;
  }) => {
    if (!selectedProject) return;
    setFormBusy(true);
    try {
      await handleUpdate(selectedProject.id, payload);
      await logAppEvent({
        type: "success",
        module: "projects",
        message: `Updated project: ${payload.name}`,
        projectId: selectedProject.id,
        meta: { name: payload.name, status: payload.status },
      });
    } catch (error) {
      await logAppEvent({
        type: "error",
        module: "projects",
        message: `Failed to update project: ${payload.name}`,
        projectId: selectedProject.id,
        meta: { error, name: payload.name },
      });
    } finally {
      setFormBusy(false);
    }
  };

  const onDeleteSelected = async (ids: string[]) => {
    setBulkDeleting(true);
    try {
      for (const id of ids) {
        await handleDelete(id);
      }
      await logAppEvent({
        type: "success",
        module: "projects",
        message: `Deleted ${ids.length} project(s)`,
        meta: { deletedCount: ids.length },
      });
    } catch (error) {
      await logAppEvent({
        type: "error",
        module: "projects",
        message: `Failed to delete ${ids.length} project(s)`,
        meta: { error, deletedCount: ids.length },
      });
    } finally {
      setBulkDeleting(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-6 pb-12">
      <ModuleHeader title="Projects" description="WORKSPACE" icon={"📁"}>
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg border border-stroke bg-surface px-5 py-2.5 text-sm font-semibold text-fg shadow-lg shadow-black/40 transition duration-200 hover:scale-[1.02]"
          onClick={() => setShowSummary(true)}
          title="Daily log summary"
        >
          <span className="text-emerald-400">{"📊"}</span> Today's Summary
        </button>
      </ModuleHeader>

      <div className="grid grid-cols-1 gap-8 min-h-0 flex-1 lg:grid-cols-12">
        <div className="h-full min-h-[400px] lg:col-span-5">
          <ProjectList
            projects={projects}
            selectedId={selectedProject?.id}
            onSelect={setSelectedProject}
            onCreate={() => setShowCreateModal(true)}
            onDeleteSelected={onDeleteSelected}
            loading={loading}
            bulkDeleting={bulkDeleting}
          />
        </div>

        <div className="h-full lg:col-span-7">
          {selectedProject ? (
            <ProjectForm
              key={selectedProject.id}
              mode="edit"
              initial={selectedProject}
              onSubmit={onEditProject}
              onDelete={async () => {
                await handleDelete(selectedProject.id);
              }}
              onCancel={() => setSelectedProject(null)}
              busy={formBusy}
              error={error}
            />
          ) : (
            <div className="glass-panel flex h-full items-center justify-center p-8 text-center">
              <div className="max-w-md space-y-3">
                <div className="text-4xl">Folder</div>
                <h2 className="text-xl font-semibold text-fg-secondary">Select a project to edit</h2>
                <p className="text-sm text-fg-muted">
                  Choose a project from the list or start a new one with the create button.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <ProjectCreateModal
        isOpen={showCreateModal}
        busy={formBusy}
        error={error}
        onClose={() => setShowCreateModal(false)}
        onSubmit={onAddProject}
      />

      {showSummary && user && (
        <DailySummaryModal isOpen={showSummary} onClose={() => setShowSummary(false)} userId={user.id} />
      )}
    </div>
  );
};

export default ProjectsPage;
