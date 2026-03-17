import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { Project, ProjectStatus } from "../../types";

const baseStatusOptions: ProjectStatus[] = [
  "draft",
  "active",
  "paused",
  "archived",
];

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
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [status, setStatus] = useState<ProjectStatus>(
    initial?.status ?? "draft"
  );

  useEffect(() => {
    if (initial) {
      console.log("[ProjectForm] Loading project into form:", initial.id, initial.name);
      setName(initial.name);
      setDescription(initial.description);
      setStatus(initial.status);
    } else {
      console.log("[ProjectForm] Clearing form for create mode");
      setName("");
      setDescription("");
      setStatus("draft");
    }
  }, [initial]);

  const mergedOptions = initial?.status
    ? Array.from(new Set([...baseStatusOptions, initial.status]))
    : baseStatusOptions;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await onSubmit({ name, description, status });
  };

  return (
    <div className="glass-panel h-full">
      <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
        <div>
          <p className="text-lg font-semibold">
            {mode === "create" ? "Create project" : "Edit project"}
          </p>
          <p className="text-sm text-slate-400">
            {mode === "create"
              ? "Add a new project to your workspace."
              : "Update project details."}
          </p>
        </div>
        {onCancel && (
          <button className="btn-ghost text-sm" type="button" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
      <form className="p-5 space-y-4" onSubmit={submit}>
        <label className="block space-y-1">
          <span className="text-sm text-slate-300">Name</span>
          <input
            className="w-full rounded-lg border border-slate-800 bg-surface px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm text-slate-300">Description</span>
          <textarea
            className="w-full rounded-lg border border-slate-800 bg-surface px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm text-slate-300">Status</span>
          <select
            className="w-full rounded-lg border border-slate-800 bg-surface px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
            value={status}
            onChange={(e) => setStatus(e.target.value as ProjectStatus)}
          >
            {mergedOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        {error && (
          <div className="text-sm text-rose-400 bg-rose-900/30 border border-rose-800 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? "Saving..." : mode === "create" ? "Create" : "Save changes"}
          </button>
          {mode === "edit" && onDelete && (
            <button
              type="button"
              className="btn-ghost text-rose-300 border-rose-700 hover:bg-rose-900/40"
              onClick={onDelete}
              disabled={busy}
            >
              Delete
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default ProjectForm;
