import { useState } from "react";
import type { TaskItem } from "../../../api/projectManagerApi";

interface Props {
  milestones: TaskItem[];
  projectId: string;
  userId: string;
  onAdd: (title: string) => Promise<void>;
  onToggle: (milestone: TaskItem) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  busy?: boolean;
}

const MilestonesCard = ({
  milestones,
  onAdd,
  onToggle,
  onDelete,
  busy,
}: Props) => {
  const [adding, setAdding] = useState(false);
  const [input, setInput] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!input.trim()) return;
    await onAdd(input.trim());
    setInput("");
    setAdding(false);
  };

  const handleToggle = async (m: TaskItem) => {
    setSavingId(m.id);
    await onToggle(m);
    setSavingId(null);
  };

  const completedCount = milestones.filter((m) => m.status === "done").length;

  return (
    <div className="glass-panel p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">🏁</span>
          <h3 className="font-semibold text-slate-200 text-sm">Milestones</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">
            {completedCount}/{milestones.length}
          </span>
          <button
            className="text-xs text-primary hover:text-primary/80 transition font-medium"
            onClick={() => setAdding((v) => !v)}
          >
            {adding ? "Cancel" : "+ Add"}
          </button>
        </div>
      </div>

      {/* Add input */}
      {adding && (
        <div className="flex gap-2">
          <input
            autoFocus
            className="flex-1 rounded-lg border border-slate-700 bg-surface px-2.5 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary transition placeholder:text-slate-600"
            placeholder="Milestone title..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
              if (e.key === "Escape") setAdding(false);
            }}
          />
          <button
            className="btn-primary text-xs px-3"
            onClick={handleAdd}
            disabled={busy || !input.trim()}
          >
            Add
          </button>
        </div>
      )}

      {/* List */}
      {milestones.length === 0 ? (
        <p className="text-xs text-slate-500 italic text-center py-4">
          No milestones yet. Add your first one above.
        </p>
      ) : (
        <ul className="space-y-2">
          {milestones.map((m) => {
            const done = m.status === "done";
            const isLoading = savingId === m.id;
            return (
              <li
                key={m.id}
                className="flex items-center gap-3 group rounded-lg px-1 py-1 hover:bg-slate-800/40 transition"
              >
                {/* Checkbox */}
                <button
                  className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition ${
                    done
                      ? "bg-emerald-500 border-emerald-500"
                      : "border-slate-600 hover:border-primary"
                  } ${isLoading ? "opacity-50" : ""}`}
                  onClick={() => handleToggle(m)}
                  disabled={isLoading}
                  title={done ? "Mark incomplete" : "Mark complete"}
                >
                  {done && (
                    <svg className="w-2.5 h-2.5 text-slate-900" fill="none" viewBox="0 0 10 10" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2 5l2.5 2.5L8 3" />
                    </svg>
                  )}
                </button>

                {/* Title */}
                <span
                  className={`flex-1 text-sm leading-snug ${
                    done ? "line-through text-slate-500" : "text-slate-200"
                  }`}
                >
                  {m.title}
                </span>

                {/* Due date */}
                {m.due_date && (
                  <span className="text-[10px] text-slate-600 hidden group-hover:inline">
                    {new Date(m.due_date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                )}

                {/* Delete */}
                <button
                  className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-rose-400 transition text-xs"
                  onClick={() => onDelete(m.id)}
                  title="Delete"
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Progress mini-bar */}
      {milestones.length > 0 && (
        <div className="pt-2 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{
                  width: `${milestones.length > 0 ? (completedCount / milestones.length) * 100 : 0}%`,
                }}
              />
            </div>
            <span className="text-xs text-slate-500 tabular-nums">
              {milestones.length > 0
                ? Math.round((completedCount / milestones.length) * 100)
                : 0}
              %
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MilestonesCard;
