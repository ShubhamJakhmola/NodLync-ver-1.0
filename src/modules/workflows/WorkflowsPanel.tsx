import { useEffect, useMemo, useRef, useState } from "react";
import ModuleHeader from "../../components/ModuleHeader";
import {
  createWorkflowV2,
  deleteWorkflowV2,
  listWorkflowsV2,
  type WorkflowV2,
} from "../../api/workflowEditorApi";
import { logAppEvent } from "../../utils/appLogger";
import WorkflowEditor from "./WorkflowEditor";
import WorkflowReactFlowView from "./WorkflowReactFlowView";
import InlineSpinner from "../../components/InlineSpinner";
import useAppStore from "../../store/useAppStore";
import { createUserItem } from "../../api/userItemsApi";

const WorkflowsPanel = () => {
  const user = useAppStore((s) => s.user);
  const projects = useAppStore((s) => s.projects);
  const selectedProject = useAppStore((s) => s.selectedProject);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [workflows, setWorkflows] = useState<WorkflowV2[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingJson, setViewingJson] = useState<WorkflowV2 | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newWorkflowName, setNewWorkflowName] = useState("");
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showAllProjects, setShowAllProjects] = useState(false);
  const [savingStuffId, setSavingStuffId] = useState<string | null>(null);

  const activeProjectId = selectedProject?.id ?? null;

  const visibleWorkflows = useMemo(() => {
    if (showAllProjects || !activeProjectId) return workflows;
    return workflows.filter(
      (wf) => (wf.json_data as any)?.__nodlync?.projectId === activeProjectId
    );
  }, [activeProjectId, showAllProjects, workflows]);

  useEffect(() => {
    if (user) {
      void refreshWorkflows();
    }
  }, [user]);

  // Log workflows view
  useEffect(() => {
    if (user && workflows.length > 0) {
      void logAppEvent({
        type: "info",
        module: "workflows",
        message: `Viewed workflows with ${workflows.length} workflows`,
        meta: { workflowCount: workflows.length },
      });
    }
  }, [user, workflows.length]);

  const refreshWorkflows = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    const { data, error: listError } = await listWorkflowsV2(user.id);

    if (listError) {
      console.error("Workflow list failed", listError);
      setError(listError.message ?? "Failed to load workflows.");
    }

    if (data) {
      setWorkflows(data);
    }

    setLoading(false);
  };

  const handleCreateVisual = async () => {
    if (!user || creating) return;

    setCreating(true);
    setError(null);

    const { data, error: createError } = await createWorkflowV2({
      name: newWorkflowName.trim() || "New Visual Automation",
      user_id: user.id,
      workflow_type: "visual",
      projectId: activeProjectId ?? undefined,
    });

    if (createError) {
      console.error("Workflow create failed", createError);
      setError(createError.message ?? "Failed to create workflow.");
      setCreating(false);
      return;
    }

    if (data) {
      setWorkflows((prev) => [data, ...prev]);
      setEditingId(data.id);
      setNewWorkflowName("");
    }

    setCreating(false);
  };

  const handleImportJson = async (files: FileList) => {
    if (!user || importing) return;

    setImporting(true);
    setError(null);

    for (const file of Array.from(files)) {
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        const { data, error: createError } = await createWorkflowV2({
          name: file.name.replace(/\.json$/i, ""),
          user_id: user.id,
          workflow_type: "imported",
          json_data: parsed,
          projectId: activeProjectId ?? undefined,
        });

        if (createError) {
          throw createError;
        }

        if (data) {
          setWorkflows((prev) => [data, ...prev]);
        }
      } catch (err: any) {
        console.error("Import failed", err);
        setError(err?.message ?? `Failed to import ${file.name}.`);
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setImporting(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Permanently delete this automation?")) return;

    setDeletingId(id);
    setError(null);

    const { error: deleteError } = await deleteWorkflowV2(id);

    if (deleteError) {
      console.error("Workflow delete failed", deleteError);
      setError(deleteError.message ?? "Failed to delete workflow.");
    } else {
      setWorkflows((prev) => prev.filter((workflow) => workflow.id !== id));
    }

    setDeletingId(null);
  };

  const handleSaveToStuff = async (workflow: WorkflowV2) => {
    if (!user) return;

    setSavingStuffId(workflow.id);
    try {
      const projectId = (workflow.json_data as any)?.__nodlync?.projectId as string | undefined;
      const projectName = projectId
        ? projects.find((project) => project.id === projectId)?.name
        : undefined;

      const response = await createUserItem({
        user_id: user.id,
        type: "workflow",
        title: workflow.name,
        description: workflow.description || "Saved workflow from NodLync.",
        data: {
          route: "/workflows",
          workflowId: workflow.id,
          workflowType: workflow.workflow_type ?? "visual",
          projectId,
          projectName,
          workflowJson: workflow.json_data ?? {},
          source: "workflows",
        },
        tags: [
          "workflow",
          workflow.workflow_type ?? "visual",
          ...(projectName ? [projectName.toLowerCase().replace(/\s+/g, "-")] : []),
        ],
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      window.alert("Workflow saved to My Stuff.");
    } catch (error: any) {
      window.alert(error?.message ?? "Failed to save workflow.");
    } finally {
      setSavingStuffId(null);
    }
  };

  if (editingId) {
    return (
      <WorkflowEditor
        workflowId={editingId}
        onClose={() => {
          setEditingId(null);
          void refreshWorkflows();
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-panel/20 overflow-hidden">
      <ModuleHeader
        title="Workflows"
        description="NODE ENGINE"
        icon="⚡"
      >
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setShowAllProjects((v) => !v)}
            className="px-4 py-3 border border-stroke bg-panel text-fg font-black tracking-widest uppercase text-[10px] rounded-xl hover:border-primary/40 hover:text-primary transition"
            title="Toggle project filter"
          >
            {showAllProjects ? "All Projects" : "Active Project"}
          </button>
          <input
            value={newWorkflowName}
            onChange={(event) => setNewWorkflowName(event.target.value)}
            placeholder="Workflow name..."
            className="min-w-[220px] bg-panel border border-stroke rounded-xl px-4 py-3 text-sm text-fg placeholder:text-fg-muted"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void handleCreateVisual();
              }
            }}
            disabled={creating || importing}
          />
          <button
            type="button"
            onClick={() => void handleCreateVisual()}
            disabled={creating || importing}
            className="px-8 py-3 bg-primary text-on-primary font-black tracking-widest uppercase text-[10px] rounded-xl hover:brightness-110 shadow-lg shadow-primary/20 transition active:scale-95 flex items-center gap-2 disabled:opacity-60"
          >
            {creating ? "Creating..." : "Create Visual"}
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={creating || importing}
            className="px-8 py-3 border border-stroke bg-panel text-fg font-black tracking-widest uppercase text-[10px] rounded-xl hover:border-primary/40 hover:text-primary transition disabled:opacity-60"
          >
            {importing ? "Importing..." : "Import JSON"}
          </button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".json"
            onChange={(event) => {
              if (event.target.files) {
                void handleImportJson(event.target.files);
              }
            }}
          />
        </div>
      </ModuleHeader>

      <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-7xl mx-auto space-y-6">
          {error && (
            <div className="rounded-2xl border border-rose-800/40 bg-rose-950/30 px-5 py-4 text-sm text-rose-200 flex items-start justify-between gap-4">
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className="text-rose-300 hover:text-white flex-shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}

          {loading && visibleWorkflows.length === 0 ? (
            <div className="p-20 flex justify-center">
              <InlineSpinner />
            </div>
          ) : visibleWorkflows.length === 0 ? (
            <div className="p-20 border-2 border-dashed border-stroke rounded-3xl text-center space-y-4 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition duration-700 group">
              <span className="text-5xl block group-hover:scale-110 transition-transform">
                Flow
              </span>
              <p className="text-sm font-bold uppercase tracking-widest text-fg-muted">
                Deploy your first logic engine above.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {visibleWorkflows.map((workflow) => {
                const isDeleting = deletingId === workflow.id;
                const projectId = (workflow.json_data as any)?.__nodlync?.projectId as string | undefined;
                const projectName = projectId
                  ? projects.find((p) => p.id === projectId)?.name
                  : undefined;

                return (
                  <div
                    key={workflow.id}
                    className="glass-panel p-0 overflow-hidden relative group hover:border-primary/40 transition shadow-2xl shadow-black/40 bg-panel/20"
                  >
                    <div className="p-6 border-b border-stroke bg-panel/10">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl">
                          {workflow.workflow_type === "visual" ? "VIS" : "JSON"}
                        </span>
                        <span
                          className="text-[10px] text-fg-muted font-mono truncate max-w-[140px]"
                          title={projectName ?? "Unassigned"}
                        >
                          {projectName ? `Project: ${projectName}` : "Unassigned"}
                        </span>
                        <button
                          onClick={() => void handleDelete(workflow.id)}
                          disabled={isDeleting}
                          className="p-1 px-2.5 bg-panel hover:bg-rose-500/10 border border-stroke rounded-xl text-rose-500/60 hover:text-rose-400 transition text-xs disabled:opacity-50"
                        >
                          {isDeleting ? "..." : "Delete"}
                        </button>
                      </div>
                      <h4 className="text-base font-black text-fg tracking-tighter truncate uppercase">
                        {workflow.name}
                      </h4>
                      <p className="text-[10px] text-fg-muted font-black tracking-widest mt-1">
                        ENGINE VERSION 2.0
                      </p>
                    </div>

                    <div className="px-6 py-4 flex items-center justify-between border-b border-stroke bg-black/20">
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-fg-muted">
                        Node Cluster
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                          workflow.workflow_type === "visual"
                            ? "border-primary/30 bg-primary/10 text-primary"
                            : "border-stroke bg-surface/50 text-fg-muted"
                        }`}
                      >
                        {workflow.workflow_type || "visual"}
                      </span>
                    </div>

                    <div className="p-3 grid grid-cols-2 gap-2 bg-panel/40">
                      <button
                        onClick={() => setEditingId(workflow.id)}
                        className="flex flex-col items-center justify-center p-4 bg-panel hover:bg-primary group/btn rounded-xl border border-stroke transition shadow-lg hover:shadow-primary/20"
                      >
                        <span className="text-lg group-hover/btn:scale-110 transition">
                          Edit
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-widest mt-2 text-fg-muted group-hover/btn:text-on-primary">
                          Visual Edit
                        </span>
                      </button>
                      <button
                        onClick={() => setViewingJson(workflow)}
                        className="flex flex-col items-center justify-center p-4 bg-panel hover:bg-surface group/btn rounded-xl border border-stroke transition hover:border-stroke-strong"
                      >
                        <span className="text-lg group-hover/btn:scale-110 transition">
                          JSON
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-widest mt-2 text-fg-muted group-hover/btn:text-fg-secondary">
                          Raw JSON
                        </span>
                      </button>
                      <button
                        onClick={() => void handleSaveToStuff(workflow)}
                        disabled={savingStuffId === workflow.id}
                        className="col-span-2 rounded-xl border border-stroke bg-panel px-4 py-3 text-[10px] font-black uppercase tracking-widest text-fg-muted transition hover:border-primary/40 hover:text-primary disabled:opacity-50"
                      >
                        {savingStuffId === workflow.id ? "Saving..." : "Save to My Stuff"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {viewingJson && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-3xl animate-in fade-in duration-300">
          <div className="w-full max-w-6xl h-[85vh] bg-panel border border-stroke rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden ring-1 ring-white/10">
            <div className="p-8 border-b border-stroke flex items-center justify-between bg-panel/20">
              <div>
                <h3 className="text-xl font-black text-fg tracking-tighter uppercase">
                  {viewingJson.name}
                </h3>
                <p className="text-[10px] text-fg-muted font-black tracking-widest uppercase mt-1">
                  Source Logic and Metadata
                </p>
              </div>
              <button
                onClick={() => setViewingJson(null)}
                className="px-6 py-2.5 bg-panel border border-stroke rounded-xl font-black hover:bg-surface transition uppercase text-[10px] tracking-widest text-fg-muted hover:text-fg"
              >
                Close
              </button>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_400px] overflow-hidden">
              <div className="border-r border-stroke bg-panel p-6">
                <div className="h-full rounded-2xl border border-stroke/50 bg-panel/10 overflow-hidden">
                  <WorkflowReactFlowView workflowJson={viewingJson.json_data || {}} />
                </div>
              </div>

              <div className="flex flex-col bg-panel/50 overflow-hidden">
                <div className="p-4 border-b border-stroke flex items-center justify-between">
                  <span className="text-[10px] font-black text-fg-muted uppercase tracking-widest px-2">
                    Raw Application Logic
                  </span>
                  <button
                    onClick={() => {
                      const blob = new Blob(
                        [JSON.stringify(viewingJson.json_data || {}, null, 2)],
                        { type: "application/json" }
                      );
                      const url = URL.createObjectURL(blob);
                      const anchor = document.createElement("a");
                      anchor.href = url;
                      anchor.download = `${viewingJson.name}.json`;
                      anchor.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="text-[9px] font-black text-primary hover:underline uppercase tracking-widest px-2"
                  >
                    Download Script
                  </button>
                </div>
                <pre className="flex-1 p-8 text-[11px] font-mono text-fg-muted overflow-auto custom-scrollbar leading-relaxed">
                  {JSON.stringify(viewingJson.json_data || {}, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowsPanel;
