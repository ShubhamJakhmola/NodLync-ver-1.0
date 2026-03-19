import { useNavigate } from "react-router-dom";

export default function DashboardQuickActionsCard() {
  const navigate = useNavigate();

  return (
    <div className="glass-panel p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Quick Actions</p>
          <h3 className="text-sm font-semibold text-slate-200 mt-2">Boost productivity</h3>
        </div>
        <div className="w-9 h-9 rounded-lg border border-slate-800/60 bg-slate-950/10 flex items-center justify-center">
          ⚡
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          className="rounded-xl border border-slate-800/60 bg-slate-950/10 p-3 text-left hover:bg-slate-800/30 transition"
          onClick={() => navigate("/projects")}
        >
          <div className="text-base">➕</div>
          <div className="text-sm font-semibold text-slate-100">New Project</div>
          <div className="text-xs text-slate-400">Create & manage</div>
        </button>
        <button
          type="button"
          className="rounded-xl border border-slate-800/60 bg-slate-950/10 p-3 text-left hover:bg-slate-800/30 transition"
          onClick={() => navigate("/meetings")}
        >
          <div className="text-base">🗓️</div>
          <div className="text-sm font-semibold text-slate-100">Add Meeting</div>
          <div className="text-xs text-slate-400">Schedule & track</div>
        </button>
        <button
          type="button"
          className="rounded-xl border border-slate-800/60 bg-slate-950/10 p-3 text-left hover:bg-slate-800/30 transition"
          onClick={() => navigate("/projects")}
        >
          <div className="text-base">📌</div>
          <div className="text-sm font-semibold text-slate-100">Add Task</div>
          <div className="text-xs text-slate-400">Through a milestone</div>
        </button>
        <button
          type="button"
          className="rounded-xl border border-slate-800/60 bg-slate-950/10 p-3 text-left hover:bg-slate-800/30 transition"
          onClick={() => navigate("/workflows")}
        >
          <div className="text-base">🔁</div>
          <div className="text-sm font-semibold text-slate-100">Add Update</div>
          <div className="text-xs text-slate-400">Automate workflows</div>
        </button>
      </div>
    </div>
  );
}

