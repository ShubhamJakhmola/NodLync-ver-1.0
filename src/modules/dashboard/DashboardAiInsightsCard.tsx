import { useNavigate } from "react-router-dom";

export default function DashboardAiInsightsCard() {
  const navigate = useNavigate();

  return (
    <div className="glass-panel p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">AI INSIGHTS</p>
          <h3 className="text-lg font-semibold text-slate-100 mt-2">Your next best actions</h3>
        </div>
        <div className="w-9 h-9 rounded-lg border border-slate-800/60 bg-slate-950/10 flex items-center justify-center">
          ✨
        </div>
      </div>

      <div className="rounded-xl border border-slate-800/60 bg-slate-950/10 p-4 text-sm text-slate-300 leading-relaxed">
        <p className="text-emerald-200/90 font-medium">
          Based on your milestones and deadlines, we predict the highest-risk items.
        </p>
        <p className="mt-2 text-slate-400">
          Generate an urgency summary and suggested next steps for today.
        </p>
      </div>

      <button
        type="button"
        className="btn-primary w-full bg-emerald-400 hover:brightness-105"
        onClick={() => navigate("/ai-playground")}
      >
        Generate Report
      </button>
    </div>
  );
}

