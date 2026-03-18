import { useEffect, useMemo, useRef, useState } from "react";

type Folder = {
  id: string;
  name: string;
  createdAt: string;
};

type StoredWorkflow = {
  id: string;
  folderId: string;
  fileName: string;
  workflowName: string | null;
  jsonText: string;
  error: string | null;
  createdAt: string;
};

type StoreShape = {
  folders: Folder[];
  workflows: StoredWorkflow[];
  selectedFolderId: string | null;
};

const STORAGE_KEY = "nodlync.workflows.localStore.v1";

const nowIso = () => new Date().toISOString();

const defaultFolderName = "My Workflows";

const createFolder = (name: string): Folder => ({
  id: crypto.randomUUID(),
  name,
  createdAt: nowIso(),
});

const extractWorkflowName = (parsed: any): string | null => {
  if (!parsed || typeof parsed !== "object") return null;
  if (typeof parsed.name === "string" && parsed.name.trim()) return parsed.name.trim();
  // Some exports may nest
  if (parsed.workflow && typeof parsed.workflow.name === "string" && parsed.workflow.name.trim()) {
    return parsed.workflow.name.trim();
  }
  return null;
};

const safePrettyJson = (text: string) => {
  try {
    const parsed = JSON.parse(text);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return text;
  }
};

const downloadTextFile = (fileName: string, text: string, mime = "application/json") => {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const WorkflowsPanel = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [folders, setFolders] = useState<Folder[]>(() => {
    const initial = createFolder(defaultFolderName);
    return [initial];
  });
  const [workflows, setWorkflows] = useState<StoredWorkflow[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  const [newFolderName, setNewFolderName] = useState("");
  const [uploadFolderId, setUploadFolderId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [viewer, setViewer] = useState<StoredWorkflow | null>(null);

  // Restore store
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        // select default
        setSelectedFolderId((prev) => prev ?? folders[0]?.id ?? null);
        setUploadFolderId((prev) => prev ?? folders[0]?.id ?? null);
        return;
      }
      const parsed: StoreShape = JSON.parse(raw);
      if (parsed.folders?.length) setFolders(parsed.folders);
      if (parsed.workflows?.length) setWorkflows(parsed.workflows);
      setSelectedFolderId(parsed.selectedFolderId ?? (parsed.folders?.[0]?.id ?? null));
      setUploadFolderId(parsed.selectedFolderId ?? (parsed.folders?.[0]?.id ?? null));
    } catch {
      // ignore corrupted storage
      setSelectedFolderId((prev) => prev ?? folders[0]?.id ?? null);
      setUploadFolderId((prev) => prev ?? folders[0]?.id ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist store
  useEffect(() => {
    const payload: StoreShape = { folders, workflows, selectedFolderId };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore quota errors
    }
  }, [folders, workflows, selectedFolderId]);

  // Keep upload folder in sync with selection when missing
  useEffect(() => {
    if (!uploadFolderId && folders.length) setUploadFolderId(folders[0].id);
    if (!selectedFolderId && folders.length) setSelectedFolderId(folders[0].id);
  }, [folders, uploadFolderId, selectedFolderId]);

  const selectedFolder = useMemo(
    () => folders.find((f) => f.id === selectedFolderId) ?? null,
    [folders, selectedFolderId]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, StoredWorkflow[]>();
    folders.forEach((f) => map.set(f.id, []));
    workflows.forEach((w) => {
      if (!map.has(w.folderId)) map.set(w.folderId, []);
      map.get(w.folderId)!.push(w);
    });
    // newest first
    map.forEach((arr) =>
      arr.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))
    );
    return map;
  }, [folders, workflows]);

  const handleCreateFolder = () => {
    const name = newFolderName.trim();
    if (!name) return;
    if (folders.some((f) => f.name.toLowerCase() === name.toLowerCase())) {
      setUploadError("Folder name already exists.");
      return;
    }
    const folder = createFolder(name);
    setFolders((prev) => [...prev, folder]);
    setNewFolderName("");
    setSelectedFolderId(folder.id);
    setUploadFolderId(folder.id);
    setUploadError(null);
  };

  const handleDeleteWorkflow = (id: string) => {
    setWorkflows((prev) => prev.filter((w) => w.id !== id));
    if (viewer?.id === id) setViewer(null);
  };

  const handleUploadFiles = async (files: FileList | File[]) => {
    const folderId = uploadFolderId ?? selectedFolderId;
    if (!folderId) {
      setUploadError("Create or select a folder first.");
      return;
    }

    const list = Array.from(files);
    if (list.length === 0) return;

    // Validate types
    const invalid = list.filter((f) => !f.name.toLowerCase().endsWith(".json"));
    if (invalid.length) {
      setUploadError("Only .json files are allowed.");
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const results: StoredWorkflow[] = [];
      for (const file of list) {
        const text = await file.text();
        let workflowName: string | null = null;
        let error: string | null = null;
        try {
          const parsed = JSON.parse(text);
          workflowName = extractWorkflowName(parsed);
        } catch (e: any) {
          error = e?.message || "Invalid JSON";
        }
        results.push({
          id: crypto.randomUUID(),
          folderId,
          fileName: file.name,
          workflowName,
          jsonText: text,
          error,
          createdAt: nowIso(),
        });
      }
      setWorkflows((prev) => [...results, ...prev]);
      setSelectedFolderId(folderId);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } finally {
      setUploading(false);
    }
  };

  const visibleWorkflows = useMemo(() => {
    if (!selectedFolderId) return workflows;
    return grouped.get(selectedFolderId) ?? [];
  }, [grouped, workflows, selectedFolderId]);

  return (
    <div className="h-[calc(100vh-theme(spacing.16))] grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-6">
      {/* Sidebar: folders */}
      <div className="glass-panel flex flex-col overflow-hidden">
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xl">Folder</span>
            <h2 className="text-lg font-bold text-slate-100 uppercase tracking-widest">
              Workflows
            </h2>
          </div>
          <p className="text-sm text-slate-400 mt-2">
            Upload and organize n8n workflow exports (.json) locally.
          </p>
        </div>

        <div className="p-4 border-b border-slate-800 bg-slate-900/30">
          <div className="flex gap-2">
            <input
              className="flex-1 bg-surface border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-slate-600"
              placeholder="New folder name..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateFolder();
              }}
            />
            <button
              type="button"
              className="btn-primary px-3 py-2 text-sm"
              onClick={handleCreateFolder}
              disabled={!newFolderName.trim()}
              title="Create folder"
            >
              Add
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {folders.map((f) => {
            const active = f.id === selectedFolderId;
            const count = grouped.get(f.id)?.length ?? 0;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedFolderId(f.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg border transition flex items-center justify-between gap-3 ${
                  active
                    ? "bg-primary/15 border-primary/30 text-primary"
                    : "bg-surface/30 border-slate-800 text-slate-200 hover:bg-slate-800/40"
                }`}
              >
                <span className="font-medium truncate">{f.name}</span>
                <span className="text-xs text-slate-500 tabular-nums">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main: upload + list */}
      <div className="glass-panel flex flex-col overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-slate-100 truncate">
              {selectedFolder ? selectedFolder.name : "All Workflows"}
            </h3>
            <p className="text-sm text-slate-400 mt-1">
              Upload single or multiple n8n exports. We’ll extract the workflow name when possible.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <select
              className="rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary"
              value={uploadFolderId ?? ""}
              onChange={(e) => setUploadFolderId(e.target.value)}
            >
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) void handleUploadFiles(e.target.files);
                }}
              />
              <button
                type="button"
                className={`btn-primary px-4 py-2 text-sm ${uploading ? "opacity-70 cursor-not-allowed" : ""}`}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || folders.length === 0}
              >
                {uploading ? "Uploading..." : "Upload .json"}
              </button>
            </div>
          </div>
        </div>

        {uploadError ? (
          <div className="px-5 pt-4">
            <div className="rounded-md border border-rose-700 bg-rose-900/30 px-3 py-2 text-xs text-rose-100">
              {uploadError}
            </div>
          </div>
        ) : null}

        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
          {visibleWorkflows.length === 0 ? (
            <div className="glass-panel p-10 text-center text-slate-500 border-dashed">
              No workflows in this folder yet. Upload one or more `.json` exports to get started.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-800">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-800">
                  <thead className="bg-slate-900/80">
                    <tr className="text-left text-xs uppercase tracking-[0.18em] text-slate-500">
                      <th className="px-4 py-3 font-medium">Workflow</th>
                      <th className="px-4 py-3 font-medium">File</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-surface/60 divide-y divide-slate-800">
                    {visibleWorkflows.map((w) => (
                      <tr key={w.id} className="hover:bg-slate-800/20 transition">
                        <td className="px-4 py-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-100 truncate">
                              {w.workflowName ?? "Unnamed workflow"}
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                              Added {new Date(w.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-slate-300 font-mono truncate" title={w.fileName}>
                            {w.fileName}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          {w.error ? (
                            <span className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs text-rose-200">
                              Invalid JSON
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
                              Ready
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              className="btn-ghost px-3 py-1.5 text-xs"
                              onClick={() => setViewer(w)}
                            >
                              View
                            </button>
                            <button
                              type="button"
                              className="btn-ghost px-3 py-1.5 text-xs"
                              onClick={() => downloadTextFile(w.fileName, w.jsonText)}
                            >
                              Download
                            </button>
                            <button
                              type="button"
                              className="inline-flex items-center justify-center rounded-lg border border-rose-500/30 px-3 py-1.5 text-xs text-rose-200 transition hover:bg-rose-500/10"
                              onClick={() => {
                                const ok = window.confirm(`Delete "${w.fileName}" from this folder?`);
                                if (ok) handleDeleteWorkflow(w.id);
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Viewer modal */}
      {viewer ? (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl rounded-2xl border border-slate-800 bg-slate-950/90 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm text-slate-400">Workflow</p>
                <p className="text-lg font-semibold text-slate-100 truncate">
                  {viewer.workflowName ?? "Unnamed workflow"}
                </p>
                <p className="text-xs text-slate-500 font-mono truncate">{viewer.fileName}</p>
              </div>
              <button
                type="button"
                className="btn-ghost px-3 py-1.5 text-xs"
                onClick={() => setViewer(null)}
              >
                Close
              </button>
            </div>

            {viewer.error ? (
              <div className="px-5 pt-4">
                <div className="rounded-md border border-rose-700 bg-rose-900/30 px-3 py-2 text-xs text-rose-100">
                  JSON parse error: {viewer.error}
                </div>
              </div>
            ) : null}

            <div className="p-5">
              <pre className="rounded-xl border border-slate-800 bg-slate-950/70 max-h-[65vh] overflow-auto text-xs font-mono text-slate-100 px-4 py-3 whitespace-pre-wrap break-words">
                {safePrettyJson(viewer.jsonText)}
              </pre>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default WorkflowsPanel;
