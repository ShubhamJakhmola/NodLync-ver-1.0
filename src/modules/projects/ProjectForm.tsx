import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { FormEvent } from "react";
import type { Project, ProjectStatus } from "../../types";

const baseStatusOptions: ProjectStatus[] = [
  "draft",
  "active",
  "in_progress",
  "completed",
  "archived",
];

const STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: "🟤 Draft",
  active: "🟢 Active",
  in_progress: "🔵 In Progress",
  completed: "✅ Completed",
  archived: "⚫ Archived",
};

interface Props {
  mode: "create" | "edit";
  initial?: Project | null;
  onSubmit: (payload: {
    name: string;
    description: string;
    status: ProjectStatus;
  }) => Promise<void>;
  onDelete?: () => Promise<void>;
  onCancel?: () => void;
  busy?: boolean;
  error?: string | null;
}

const ProjectForm = ({
  mode,
  initial,
  onSubmit,
  onDelete,
  onCancel,
  busy = false,
  error,
}: Props) => {
  const navigate = useNavigate();
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [status, setStatus] = useState<ProjectStatus>(
    initial?.status ?? "draft"
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (mode === "create") {
      setName("");
      setDescription("");
      setStatus("draft");
    } else if (initial) {
      setName(initial.name);
      setDescription(initial.description);
      setStatus(initial.status);
    } else {
      setName("");
      setDescription("");
      setStatus("draft");
    }
    setValidationError(null);
    setConfirmDelete(false);
    setSaved(false);
  }, [initial, mode]);

  const mergedOptions: ProjectStatus[] = initial?.status
    ? (Array.from(new Set([...baseStatusOptions, initial.status])) as ProjectStatus[])
    : baseStatusOptions;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Client-side validation
    if (!name.trim()) {
      setValidationError("Project name is required.");
      return;
    }
    if (name.trim().length < 2) {
      setValidationError("Project name must be at least 2 characters.");
      return;
    }

    await onSubmit({ name: name.trim(), description: description.trim(), status });

    // Show saved flash for edit mode
    if (mode === "edit") {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    if (onDelete) {
      await onDelete();
    }
    setConfirmDelete(false);
  };

  const displayError = validationError || error;

  return (
    <div className="h-full flex flex-col border border-stroke/40 rounded-xl bg-surface/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stroke px-4 py-3">
        <div>
          <p className="text-base font-bold text-fg tracking-tight">
            {mode === "create" ? "NEW PROJECT" : "EDIT PROJECT"}
          </p>
          <p className="text-[11px] text-fg-muted font-medium uppercase tracking-tighter">
            {mode === "create"
              ? "Initialize workspace"
              : initial?.name
              ? `ID: ${initial.id.split('-')[0]}`
              : "Update metadata"}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Open Full Manager button (edit mode only) */}
          {mode === "edit" && initial?.id && (
            <button
              type="button"
              className="btn-ghost px-2 py-1 text-[10px] uppercase font-bold flex items-center gap-1"
              onClick={() => navigate(`/projects/${initial.id}`)}
              title="Open full project manager"
            >
              MANAGER ➔
            </button>
          )}
          {onCancel && mode === "create" && (
            <button
              className="btn-ghost px-2 py-1 text-[10px] uppercase font-bold"
              type="button"
              onClick={onCancel}
            >
              CLOSE
            </button>
          )}
        </div>
      </div>

      {/* Form */}
      <form className="p-4 space-y-3 flex-1 overflow-y-auto" onSubmit={submit}>
        {/* Name field */}
        <label className="block space-y-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-fg-muted">
            Name <span className="text-rose-400">*</span>
          </span>
          <input
            className={`w-full rounded-md border bg-surface px-3 py-1.5 text-sm text-fg focus:outline-none focus:ring-1 focus:ring-primary transition ${
              validationError && !name.trim()
                ? "border-rose-600 focus:ring-rose-500"
                : "border-stroke"
            }`}
            placeholder="Project name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (validationError) setValidationError(null);
            }}
            autoFocus={mode === "create"}
          />
        </label>

        {/* Description field */}
        <label className="block space-y-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-fg-muted">Description</span>
          <textarea
            className="w-full rounded-md border border-stroke bg-surface px-3 py-1.5 text-xs text-fg focus:outline-none focus:ring-1 focus:ring-primary transition resize-none"
            placeholder="Scope and objectives..."
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        {/* Status field */}
        <label className="block space-y-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-fg-muted">Current Status</span>
          <select
            className="w-full rounded-md border border-stroke bg-surface/50 px-3 py-1.5 text-xs text-fg-secondary focus:outline-none focus:ring-1 focus:ring-primary transition cursor-pointer appearance-none"
            value={status}
            onChange={(e) => setStatus(e.target.value as ProjectStatus)}
          >
            {mergedOptions.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s] ?? s}
              </option>
            ))}
          </select>
        </label>

        {/* Error display */}
        {displayError && (
          <div className="text-sm text-rose-300 bg-rose-900/30 border border-rose-700 rounded-lg px-3 py-2 flex items-start gap-2">
            <span className="mt-0.5">⚠️</span>
            <span>{displayError}</span>
          </div>
        )}

        {/* Saved flash */}
        {saved && !busy && (
          <div className="text-sm text-emerald-300 bg-emerald-900/30 border border-emerald-700 rounded-lg px-3 py-2 flex items-center gap-2">
            <span>✓</span>
            <span>Changes saved successfully.</span>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2 pt-0.5">
          <button
            type="submit"
            className="btn-primary text-[10px] font-black uppercase tracking-widest px-4 py-2 shadow-lg shadow-primary/20"
            disabled={busy}
          >
            {busy
              ? "SAVING..."
              : mode === "create"
              ? "CREATE PROJECT"
              : "SAVE CHANGES"}
          </button>

          {mode === "edit" && onDelete && (
            <button
              type="button"
              className={`px-3 py-2 text-[10px] font-bold uppercase tracking-widest rounded-md border transition ${
                confirmDelete
                  ? "text-rose-200 border-rose-600 bg-rose-900/40 hover:bg-rose-800/50"
                  : "text-rose-400 border-rose-800 hover:bg-rose-900/10"
              }`}
              onClick={handleDelete}
              disabled={busy}
            >
              {confirmDelete ? "CONFIRM" : "DELETE"}
            </button>
          )}

          {confirmDelete && (
            <button
              type="button"
              className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-fg-muted hover:text-fg transition"
              onClick={() => setConfirmDelete(false)}
            >
              CANCEL
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default ProjectForm;
