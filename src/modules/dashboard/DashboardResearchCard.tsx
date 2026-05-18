import { useNavigate } from "react-router-dom";

export default function DashboardResearchCard() {
  const navigate = useNavigate();

  return (
    <div className="glass-panel p-5 space-y-4">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-stroke text-xs font-black text-primary">RS</span>
        <h3 className="min-w-0 text-sm font-semibold text-fg-secondary text-wrap-balance">Research Mode</h3>
      </div>
      <p className="overflow-anywhere text-xs leading-relaxed text-fg-muted">
        Compare provider responses, organize findings, and turn reviewed research into project tasks.
      </p>
      <button
        type="button"
        onClick={() => navigate("/app/ai-playground")}
        className="btn-primary w-full py-2 text-xs font-bold"
      >
        Open AI Playground
      </button>
    </div>
  );
}
