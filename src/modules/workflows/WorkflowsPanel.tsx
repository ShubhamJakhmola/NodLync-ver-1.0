import { useEffect, useMemo, useRef, useState } from "react";
import ModuleHeader from "../../components/ModuleHeader";
import InlineSpinner from "../../components/InlineSpinner";
import useAppStore from "../../store/useAppStore";
import { getApiVaultItems, type ApiVaultItem } from "../../api/apiVaultApi";
import { sendChatMessage, type ChatMessage } from "../../api/aiPlaygroundApi";
import type { WorkflowDefinition, WorkflowSourceType } from "./domain";
import { createEmptyWorkflowDefinition, isWorkflowDefinition } from "./domain";
import { parseN8nJson } from "./import/n8n";
import { validateWorkflow } from "./validation";
import {
  createWorkflowRecord,
  deleteWorkflowRecord,
  listWorkflowRecords,
  updateWorkflowRecord,
  type WorkflowRecord,
} from "./storage/workflowsStorage";
import WorkflowWorkspace from "./ui/WorkflowWorkspace";

type SortKey = "updated_desc" | "name_asc" | "created_desc";

const WorkflowsPanel = () => {
  const user = useAppStore((s) => s.user);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<"list" | "create">("list");
  const [records, setRecords] = useState<WorkflowRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<WorkflowSourceType | "all">("all");
  const [sort, setSort] = useState<SortKey>("updated_desc");

  const [selected, setSelected] = useState<WorkflowRecord | null>(null);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Create tab state (AI + builder)
  const [vaultItems, setVaultItems] = useState<ApiVaultItem[]>([]);
  const [vaultLoading, setVaultLoading] = useState(false);
  const [vaultError, setVaultError] = useState<string | null>(null);
  const [selectedVaultId, setSelectedVaultId] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("gpt-4o-mini");
  const [aiPrompt, setAiPrompt] = useState<string>("");
  const [aiGenerating, setAiGenerating] = useState(false);

  const [draft, setDraft] = useState<WorkflowDefinition>(() => createEmptyWorkflowDefinition());
  const [draftFocus, setDraftFocus] = useState(false);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = records;

    if (sourceFilter !== "all") rows = rows.filter((r) => r.source_type === sourceFilter);
    if (q) rows = rows.filter((r) => `${r.name} ${r.description}`.toLowerCase().includes(q));

    const sorted = [...rows];
    if (sort === "updated_desc") sorted.sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
    if (sort === "created_desc") sorted.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    if (sort === "name_asc") sorted.sort((a, b) => a.name.localeCompare(b.name));
    return sorted;
  }, [query, records, sort, sourceFilter]);

  useEffect(() => {
    if (!user) return;
    void refresh();
  }, [user]);

  useEffect(() => {
    if (!user || tab !== "create") return;
    void loadVault();
  }, [tab, user]);

  const refresh = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    const { data, error: e } = await listWorkflowRecords(user.id);
    if (e) setError(e.message ?? "Failed to load workflows.");
    if (data) setRecords(data);
    setLoading(false);
  };

  const loadVault = async () => {
    if (!user) return;
    setVaultLoading(true);
    setVaultError(null);
    const { data, error: e } = await getApiVaultItems(user.id);
    if (e) setVaultError(e.message ?? "Failed to load API Vault.");
    if (data) setVaultItems(data);
    setVaultLoading(false);
  };

  const handleCreateEmpty = async () => {
    if (!user || creating) return;
    setCreating(true);
    setError(null);
    const def = createEmptyWorkflowDefinition("New Workflow", "manual");
    const { data, error: e } = await createWorkflowRecord({
      userId: user.id,
      name: def.name || "New Workflow",
      description: "",
      sourceType: "manual",
      rawJson: def,
    });
    if (e) setError(e.message ?? "Failed to create workflow.");
    if (data) {
      setRecords((prev) => [data, ...prev]);
      setSelected(data);
    }
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Permanently delete this workflow?")) return;
    setDeletingId(id);
    setError(null);
    const { error: e } = await deleteWorkflowRecord(id);
    if (e) setError(e.message ?? "Failed to delete workflow.");
    else setRecords((prev) => prev.filter((r) => r.id !== id));
    if (selected?.id === id) setSelected(null);
    setDeletingId(null);
  };

  const handleImportJson = async (files: FileList) => {
    if (!user || importing) return;
    setImporting(true);
    setError(null);
    for (const file of Array.from(files)) {
      try {
        const text = await file.text();
        const raw = JSON.parse(text);

        const { name, definition } = parseN8nJson(raw);
        const issues = validateWorkflow(definition);
        const blocking = issues.filter((i) => i.level === "error");
        if (blocking.length) throw new Error(blocking[0].message);

        const { data, error: e } = await createWorkflowRecord({
          userId: user.id,
          name: name || file.name.replace(/\\.json$/i, ""),
          description: "",
          sourceType: "imported",
          rawJson: { ...definition, meta: { ...(definition.meta ?? {}), imported_from: "n8n" } },
        });
        if (e) throw e;
        if (data) setRecords((prev) => [data, ...prev]);
      } catch (err: any) {
        setError(err?.message ?? `Failed to import ${file.name}.`);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
    setImporting(false);
  };

  const handleGenerateFromAi = async () => {
    if (!user || aiGenerating) return;
    const apiItem = vaultItems.find((v) => v.id === selectedVaultId);
    if (!apiItem) {
      setVaultError("Select an API Vault key to generate a workflow.");
      return;
    }

    setAiGenerating(true);
    setVaultError(null);

    const system = [
      "You generate execution-ready workflow JSON for NodLync.",
      "Return ONLY valid JSON. No markdown.",
      "Schema:",
      "{ version: 1, name: string, description?: string, nodes: [{id,type,config,position?}], edges: [{source,target}] }",
      'Node types: "trigger" | "api" | "logic" | "delay" | "output".',
      "API nodes must include config.apiKeyId = the provided keyId, and config.request = { url, method, headers?, body?, auth? }.",
      "Use a simple DAG (no cycles). Add an output node that returns final data.",
    ].join("\n");

    const messages: ChatMessage[] = [
      { id: "sys", role: "system", content: system, timestamp: new Date() },
      {
        id: "user",
        role: "user",
        content: `keyId: ${apiItem.id}\nUser request:\n${aiPrompt.trim()}`,
        timestamp: new Date(),
      },
    ];

    try {
      const content = await sendChatMessage({ apiItem, model: selectedModel, messages });
      const parsed = JSON.parse(content);
      if (!isWorkflowDefinition(parsed)) throw new Error("AI returned invalid workflow JSON.");

      const def: WorkflowDefinition = {
        ...parsed,
        version: 1,
        meta: { ...(parsed as any).meta, source_type: "ai_generated", created_by_model: selectedModel },
      };

      const issues = validateWorkflow(def);
      const blocking = issues.filter((i) => i.level === "error");
      if (blocking.length) throw new Error(blocking[0].message);

      setDraft(def);
    } catch (err: any) {
      setVaultError(err?.message ?? "AI generation failed.");
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!user) return;
    setCreating(true);
    setError(null);
    const name = draft.name?.trim() || "AI Workflow";
    const { data, error: e } = await createWorkflowRecord({
      userId: user.id,
      name,
      description: draft.description ?? "",
      sourceType: draft.meta?.source_type === "ai_generated" ? "ai_generated" : "manual",
      rawJson: draft,
    });
    if (e) setError(e.message ?? "Failed to save workflow.");
    if (data) {
      setRecords((prev) => [data, ...prev]);
      setSelected(data);
      setTab("list");
    }
    setCreating(false);
  };

  const handleSaveExisting = async (id: string, nextDef: WorkflowDefinition) => {
    if (!user) return;
    const issues = validateWorkflow(nextDef);
    const blocking = issues.filter((i) => i.level === "error");
    if (blocking.length) {
      setError(blocking[0].message);
      return;
    }

    const { data, error: e } = await updateWorkflowRecord({
      userId: user.id,
      id,
      name: nextDef.name,
      description: nextDef.description,
      rawJson: nextDef,
      sourceType: nextDef.meta?.source_type,
    });
    if (e) setError(e.message ?? "Failed to save workflow.");
    if (data) {
      setRecords((prev) => prev.map((r) => (r.id === id ? data : r)));
      setSelected(data);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg via-bg to-surface text-fg">
      <ModuleHeader
        title="Workflows"
        description="Import, generate, edit, and run execution-ready pipelines"
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
            />
          </svg>
        }
      />

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTab("list")}
                className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition ${
                  tab === "list"
                    ? "bg-primary/15 border-primary/40 text-primary"
                    : "bg-panel border-stroke text-fg-muted hover:text-fg hover:border-stroke-strong"
                }`}
              >
                Workflows
              </button>
              <button
                onClick={() => setTab("create")}
                className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition ${
                  tab === "create"
                    ? "bg-primary/15 border-primary/40 text-primary"
                    : "bg-panel border-stroke text-fg-muted hover:text-fg hover:border-stroke-strong"
                }`}
              >
                Create New
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => void handleCreateEmpty()}
                disabled={!user || creating}
                className="px-4 py-2 rounded-xl border border-stroke bg-panel text-[10px] font-black uppercase tracking-widest text-fg-muted hover:border-primary/40 hover:text-primary disabled:opacity-50"
              >
                {creating ? "Creating..." : "New Manual"}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) void handleImportJson(e.target.files);
                }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={!user || importing}
                className="px-4 py-2 rounded-xl border border-stroke bg-panel text-[10px] font-black uppercase tracking-widest text-fg-muted hover:border-primary/40 hover:text-primary disabled:opacity-50"
              >
                {importing ? "Importing..." : "Import JSON"}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
              {error}
            </div>
          )}

          {tab === "list" && (
            <div className="rounded-[2rem] border border-stroke bg-panel/40 p-6">
              <div className="flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
                <div className="flex flex-1 items-center gap-2">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search workflows…"
                    className="w-full rounded-xl border border-stroke bg-panel px-4 py-3 text-sm text-fg outline-none focus:border-primary/50"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={sourceFilter}
                    onChange={(e) => setSourceFilter(e.target.value as any)}
                    className="rounded-xl border border-stroke bg-panel px-3 py-3 text-xs text-fg-muted outline-none"
                  >
                    <option value="all">All types</option>
                    <option value="manual">Manual</option>
                    <option value="imported">Imported</option>
                    <option value="ai_generated">AI</option>
                  </select>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as any)}
                    className="rounded-xl border border-stroke bg-panel px-3 py-3 text-xs text-fg-muted outline-none"
                  >
                    <option value="updated_desc">Last updated</option>
                    <option value="created_desc">Created</option>
                    <option value="name_asc">Name</option>
                  </select>
                  <button
                    onClick={() => void refresh()}
                    className="rounded-xl border border-stroke bg-panel px-3 py-3 text-xs font-black uppercase tracking-widest text-fg-muted hover:text-fg hover:border-stroke-strong"
                  >
                    Refresh
                  </button>
                </div>
              </div>

              <div className="mt-6">
                {loading ? (
                  <div className="py-16 flex items-center justify-center text-fg-muted">
                    <InlineSpinner /> <span className="ml-3">Loading workflows…</span>
                  </div>
                ) : visible.length === 0 ? (
                  <div className="py-16 text-center text-fg-muted">
                    No workflows yet. Import a JSON file or create a new one.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {visible.map((wf) => (
                      <div
                        key={wf.id}
                        className="rounded-2xl border border-stroke bg-panel p-5 hover:border-primary/40 transition"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-lg font-black tracking-tight truncate">{wf.name}</div>
                            <div className="text-xs text-fg-muted mt-1 line-clamp-2">
                              {wf.description || "—"}
                            </div>
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border border-stroke text-fg-muted">
                            {wf.source_type === "ai_generated"
                              ? "AI"
                              : wf.source_type === "imported"
                                ? "Imported"
                                : "Manual"}
                          </span>
                        </div>
                        <div className="mt-4 text-[11px] text-fg-muted">
                          Updated: {new Date(wf.updated_at).toLocaleString()}
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setSelected(wf)}
                            className="rounded-xl border border-stroke bg-panel/60 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-fg-muted hover:text-primary hover:border-primary/40"
                          >
                            Open
                          </button>
                          <button
                            onClick={() => void handleDelete(wf.id)}
                            disabled={deletingId === wf.id}
                            className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-rose-200 hover:bg-rose-500/15 disabled:opacity-50"
                          >
                            {deletingId === wf.id ? "Deleting…" : "Delete"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "create" && (
            <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6">
              <div className="rounded-[2rem] border border-stroke bg-panel/40 p-6">
                <div className="text-sm font-black uppercase tracking-widest text-fg-muted">
                  Text → Workflow (AI)
                </div>

                {vaultError && (
                  <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
                    {vaultError}
                  </div>
                )}

                <div className="mt-4 space-y-3">
                  <label className="text-[10px] font-black text-fg-muted uppercase tracking-widest">
                    API Vault Key
                  </label>
                  <select
                    value={selectedVaultId}
                    onChange={(e) => setSelectedVaultId(e.target.value)}
                    className="w-full rounded-xl border border-stroke bg-panel px-3 py-3 text-xs text-fg outline-none"
                    disabled={vaultLoading}
                  >
                    <option value="">{vaultLoading ? "Loading..." : "Select a key"}</option>
                    {vaultItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.key_name} ({item.provider})
                      </option>
                    ))}
                  </select>

                  <label className="text-[10px] font-black text-fg-muted uppercase tracking-widest">
                    Model
                  </label>
                  <input
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full rounded-xl border border-stroke bg-panel px-3 py-3 text-xs text-fg outline-none"
                    placeholder="gpt-4o-mini"
                  />

                  <label className="text-[10px] font-black text-fg-muted uppercase tracking-widest">
                    Prompt
                  </label>
                  <textarea
                    rows={8}
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    className="w-full rounded-xl border border-stroke bg-panel px-4 py-3 text-sm text-fg outline-none focus:border-primary/50 custom-scrollbar"
                    placeholder="Describe the workflow you want to build..."
                  />

                  <button
                    onClick={() => void handleGenerateFromAi()}
                    disabled={aiGenerating || !aiPrompt.trim()}
                    className="w-full rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/15 disabled:opacity-50"
                  >
                    {aiGenerating ? "Generating..." : "Generate Workflow JSON"}
                  </button>

                  <button
                    onClick={() => void handleSaveDraft()}
                    disabled={creating}
                    className="w-full rounded-xl border border-stroke bg-panel px-4 py-3 text-[10px] font-black uppercase tracking-widest text-fg-muted hover:text-primary hover:border-primary/40 disabled:opacity-50"
                  >
                    {creating ? "Saving..." : "Save as Workflow"}
                  </button>

                  <button
                    onClick={() => setDraftFocus(true)}
                    className="w-full rounded-xl border border-stroke bg-panel px-4 py-3 text-[10px] font-black uppercase tracking-widest text-fg-muted hover:text-fg hover:border-stroke-strong"
                  >
                    Open Full Screen
                  </button>
                </div>

                {vaultLoading && (
                  <div className="mt-4 text-xs text-fg-muted">
                    <InlineSpinner /> <span className="ml-2">Loading API Vault…</span>
                  </div>
                )}
                {vaultError === null && vaultLoading === false && vaultItems.length === 0 && (
                  <div className="mt-4 text-xs text-fg-muted">
                    No API Vault keys found. Add one in API Vault to enable AI generation and secure API nodes.
                  </div>
                )}
              </div>

              <div className="rounded-[2rem] border border-stroke bg-panel/40 overflow-hidden h-[calc(100vh-240px)] min-h-[720px]">
                <WorkflowWorkspace
                  mode="draft"
                  record={null}
                  initialDefinition={draft}
                  onChangeDefinition={setDraft}
                  onSave={(def) => void setDraft(def)}
                  onSaveExisting={() => {}}
                />
              </div>
            </div>
          )}
        </div>
      </main>

      {selected && (
        <WorkflowWorkspace
          mode="record"
          record={selected}
          initialDefinition={(selected.raw_json as any) as WorkflowDefinition}
          onChangeDefinition={() => {}}
          onSave={(def) => void handleSaveExisting(selected.id, def)}
          onSaveExisting={(def) => void handleSaveExisting(selected.id, def)}
          onClose={() => setSelected(null)}
        />
      )}

      {draftFocus && (
        <WorkflowWorkspace
          mode="draft"
          presentation="overlay"
          record={null}
          initialDefinition={draft}
          onChangeDefinition={setDraft}
          onSave={(def) => void setDraft(def)}
          onSaveExisting={() => {}}
          onClose={() => setDraftFocus(false)}
        />
      )}
    </div>
  );
};

export default WorkflowsPanel;
