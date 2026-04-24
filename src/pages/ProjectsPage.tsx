import { useEffect, useState } from "react";
import ProjectCreateModal from "../modules/projects/ProjectCreateModal";
import ProjectForm from "../modules/projects/ProjectForm";
import ProjectList from "../modules/projects/ProjectList";
import DailySummaryModal from "../modules/projects/DailySummaryModal";
import ModuleHeader from "../components/ModuleHeader";
import { useProjects } from "../hooks/useProjects";
import { logAppEvent } from "../utils/appLogger";
import type { ProjectStatus } from "../types";
import { useSeo } from "../hooks/useSeo";

const ProjectsPage = () => {
  useSeo("Project Management");
  const {
    projects,
    loading,
    error,
    selectedProject,
    fetchProjects,
    handleCreate,
    handleUpdate,
    handleDelete,
    handleBulkUpdate,
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
    <div className="flex h-full flex-col gap-4 pb-4">
      <ModuleHeader title="Projects" description="WORKSPACE" icon={"📁"}>
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg border border-stroke bg-surface px-4 py-2 text-xs font-bold text-fg shadow-md shadow-black/20 transition-all hover:bg-surface-hover active:scale-95"
          onClick={() => setShowSummary(true)}
          title="Daily log summary"
        >
          <span className="text-emerald-400">{"📊"}</span> Summary
        </button>
      </ModuleHeader>

      <div className="grid grid-cols-1 gap-3 min-h-0 flex-1 lg:grid-cols-12 items-stretch">
        <div className="flex flex-col min-h-0 lg:col-span-5">
          <ProjectList
            projects={projects}
            selectedId={selectedProject?.id}
            onSelect={setSelectedProject}
            onCreate={() => setShowCreateModal(true)}
            onDeleteSelected={onDeleteSelected}
            onBulkStatusUpdate={async (ids, status) => {
              await handleBulkUpdate(ids, { status });
              await logAppEvent({
                type: "success",
                module: "projects",
                message: `Updated status to ${status} for ${ids.length} projects`,
                meta: { count: ids.length, status }
              });
            }}
            loading={loading}
            bulkDeleting={bulkDeleting}
          />
        </div>

        <div className="flex flex-col min-h-0 lg:col-span-7 h-full">
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
            <div className="flex flex-col items-center justify-center p-4 text-center border border-stroke/40 rounded-xl bg-surface/5 h-full">
              <div className="max-w-xs space-y-2 opacity-60">
                <div className="text-3xl grayscale mb-2">📁</div>
                <h2 className="text-sm font-black uppercase tracking-widest text-fg">Project Details</h2>
                <p className="text-[11px] text-fg-muted font-medium">
                  Select a project artifact from the registry to view data logs and configuration.
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
