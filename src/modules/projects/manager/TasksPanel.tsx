import { useState } from "react";
import type { TaskItem } from "../../../api/projectManagerApi";

interface Props {
  tasks: TaskItem[];
  projectId: string;
  userId: string;
  onAdd: (title: string) => Promise<void>;
  onToggle: (task: TaskItem) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  busy?: boolean;
}

const STATUS_CYCLE: Record<TaskItem["status"], TaskItem["status"]> = {
  todo: "in_progress",
  in_progress: "done",
  done: "todo",
};

const STATUS_STYLE: Record<TaskItem["status"], { label: string; cls: string }> = {
  todo: { label: "To Do", cls: "text-slate-400 border-slate-700 bg-slate-800" },
  in_progress: {
    label: "In Progress",
    cls: "text-amber-300 border-amber-700 bg-amber-900/20",
  },
  done: {
    label: "Done",
    cls: "text-emerald-300 border-emerald-700 bg-emerald-900/20",
  },
};

const TasksPanel = ({
  tasks,
  onAdd,
  onToggle,
  onDelete,
  busy,
}: Props) => {
  const [input, setInput] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<TaskItem["status"] | "all">("all");

  const handleAdd = async () => {
    if (!input.trim()) return;
    await onAdd(input.trim());
    setInput("");
  };

  const handleToggle = async (task: TaskItem) => {
    setSavingId(task.id);
    await onToggle({ ...task, status: STATUS_CYCLE[task.status] });
    setSavingId(null);
  };

  const filtered =
    filter === "all" ? tasks : tasks.filter((t) => t.status === filter);

  const stats = {
    total: tasks.length,
    done: tasks.filter((t) => t.status === "done").length,
    inProgress: tasks.filter((t) => t.status === "in_progress").length,
    todo: tasks.filter((t) => t.status === "todo").length,
  };

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        {(
          [
            { label: "Total", value: stats.total, color: "text-slate-300" },
            { label: "To Do", value: stats.todo, color: "text-slate-400" },
            { label: "In Progress", value: stats.inProgress, color: "text-amber-400" },
            { label: "Done", value: stats.done, color: "text-emerald-400" },
          ] as const
        ).map(({ label, value, color }) => (
          <div key={label} className="glass-panel p-4 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-slate-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Add + Filter row */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 flex gap-2 min-w-0">
          <input
            className="flex-1 rounded-lg border border-slate-700 bg-surface px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary transition placeholder:text-slate-600"
            placeholder="Add a task and press Enter..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
            }}
          />
          <button
            className="btn-primary text-sm px-4"
            onClick={handleAdd}
            disabled={busy || !input.trim()}
          >
            Add Task
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-1 border border-slate-800">
          {(["all", "todo", "in_progress", "done"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-md transition font-medium ${
                filter === f
                  ? "bg-slate-700 text-slate-100"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {f === "all" ? "All" : f === "in_progress" ? "In Progress" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Task list */}
      <div className="glass-panel divide-y divide-slate-800">
        {filtered.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-slate-500 text-sm">
              {filter === "all"
                ? "No tasks yet. Add your first task above."
                : `No ${filter.replace("_", " ")} tasks.`}
            </p>
          </div>
        ) : (
          filtered.map((task) => {
            const style = STATUS_STYLE[task.status];
            const isLoading = savingId === task.id;

            return (
              <div
                key={task.id}
                className="flex items-center gap-4 px-4 py-3 hover:bg-slate-800/30 transition group"
              >
                {/* Status cycler */}
                <button
                  className={`text-[10px] font-semibold border rounded-full px-2.5 py-1 flex-shrink-0 transition hover:brightness-125 ${
                    style.cls
                  } ${isLoading ? "opacity-50" : ""}`}
                  onClick={() => handleToggle(task)}
                  disabled={isLoading}
                  title="Click to advance status"
                >
                  {style.label}
                </button>

                {/* Title */}
                <span
                  className={`flex-1 text-sm ${
                    task.status === "done"
                      ? "line-through text-slate-500"
                      : "text-slate-200"
                  }`}
                >
                  {task.title}
                </span>

                {/* Date */}
                <span className="text-xs text-slate-600 hidden group-hover:inline">
                  {new Date(task.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>

                {/* Delete */}
                <button
                  className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-rose-400 transition text-sm"
                  onClick={() => onDelete(task.id)}
                  title="Delete task"
                >
                  ✕
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TasksPanel;
