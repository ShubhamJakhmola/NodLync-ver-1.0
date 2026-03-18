import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { FormEvent } from "react";
import type { Project, ProjectStatus } from "../../types";

const baseStatusOptions: ProjectStatus[] = [
  "draft",
  "active",
  "paused",
  "archived",
];

const STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: "🟤 Draft",
  active: "🟢 Active",
  paused: "🟡 Paused",
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
    if (initial) {
      console.log(
        "[ProjectForm] Loading project into form:",
        initial.id,
        initial.name
      );
      setName(initial.name);
      setDescription(initial.description);
      setStatus(initial.status);
    } else {
      console.log("[ProjectForm] Clearing form for create mode");
      setName("");
      setDescription("");
      setStatus("draft");
    }
    setValidationError(null);
    setConfirmDelete(false);
    setSaved(false);
  }, [initial]);

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
    <div className="glass-panel h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
        <div>
          <p className="text-lg font-semibold">
            {mode === "create" ? "New Project" : "Edit Project"}
          </p>
          <p className="text-sm text-slate-400">
            {mode === "create"
              ? "Add a new project to your workspace."
              : initial?.name
              ? `Editing: ${initial.name}`
              : "Update project details."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Open Full Manager button (edit mode only) */}
          {mode === "edit" && initial?.id && (
            <button
              type="button"
              className="btn-ghost text-sm flex items-center gap-1.5"
              onClick={() => navigate(`/projects/${initial.id}`)}
              title="Open full project manager"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
              Full View
            </button>
          )}
          {onCancel && mode === "create" && (
            <button
              className="btn-ghost text-sm"
              type="button"
              onClick={onCancel}
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Form */}
      <form className="p-5 space-y-4 flex-1 overflow-y-auto" onSubmit={submit}>
        {/* Name field */}
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-slate-300">
            Name <span className="text-rose-400">*</span>
          </span>
          <input
            className={`w-full rounded-lg border bg-surface px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary transition ${
              validationError && !name.trim()
                ? "border-rose-600 focus:ring-rose-500"
                : "border-slate-700"
            }`}
            placeholder="e.g. Mobile App Redesign"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (validationError) setValidationError(null);
            }}
            autoFocus={mode === "create"}
          />
        </label>

        {/* Description field */}
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-slate-300">Description</span>
          <textarea
            className="w-full rounded-lg border border-slate-700 bg-surface px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary transition resize-none"
            placeholder="Brief description of this project..."
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        {/* Status field */}
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-slate-300">Status</span>
          <select
            className="w-full rounded-lg border border-slate-700 bg-surface px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary transition"
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
        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            className="btn-primary"
            disabled={busy}
          >
            {busy
              ? "Saving..."
              : mode === "create"
              ? "Create Project"
              : "Save Changes"}
          </button>

          {mode === "edit" && onDelete && (
            <button
              type="button"
              className={`btn-ghost text-sm transition-all ${
                confirmDelete
                  ? "text-rose-200 border-rose-600 bg-rose-900/40 hover:bg-rose-800/50"
                  : "text-rose-400 border-rose-800 hover:bg-rose-900/30"
              }`}
              onClick={handleDelete}
              disabled={busy}
            >
              {confirmDelete ? "Confirm delete?" : "Delete"}
            </button>
          )}

          {confirmDelete && (
            <button
              type="button"
              className="btn-ghost text-sm text-slate-400"
              onClick={() => setConfirmDelete(false)}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default ProjectForm;
