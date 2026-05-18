import { useNavigate } from "react-router-dom";

export default function DashboardAiInsightsCard() {
  const navigate = useNavigate();

  return (
    <div className="glass-panel p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-fg-muted">AI WORKSPACE</p>
          <h3 className="mt-2 text-lg font-semibold text-fg text-wrap-balance">Provider-ready prompts</h3>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-stroke/60 bg-panel/10 text-xs font-black text-primary">
          AI
        </div>
      </div>

      <div className="rounded-lg border border-stroke/60 bg-panel/10 p-4 text-sm leading-relaxed text-fg-secondary">
        <p className="ai-highlight font-medium">
          Connect a provider key, then use AI to summarize milestones, deadlines, and blockers.
        </p>
        <p className="mt-2 overflow-anywhere text-fg-muted">
          Start with a small prompt and save the version your team trusts.
        </p>
      </div>

      <button
        type="button"
        className="btn-primary w-full bg-emerald-400 hover:brightness-105"
        onClick={() => navigate("/app/ai-playground")}
      >
        Open Playground
      </button>
    </div>
  );
}
