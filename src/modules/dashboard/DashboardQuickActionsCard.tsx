import { useNavigate } from "react-router-dom";

const actions = [
  { label: "New Project", helper: "Plan work", to: "/app/projects", marker: "P" },
  { label: "Add Key", helper: "Connect provider", to: "/app/api-vault", marker: "K" },
  { label: "Try AI", helper: "Test a prompt", to: "/app/ai-playground", marker: "AI" },
  { label: "Workflow", helper: "Repeat steps", to: "/app/workflows", marker: "W" },
];

export default function DashboardQuickActionsCard() {
  const navigate = useNavigate();

  return (
    <div className="glass-panel p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-fg-muted">Quick Actions</p>
          <h3 className="mt-2 text-sm font-semibold text-fg-secondary text-wrap-balance">Start the AI workspace loop</h3>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-stroke/60 bg-panel/10 text-xs font-black text-primary">
          GO
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            className="rounded-lg border border-stroke/60 bg-panel/10 p-3 text-left transition hover:border-primary/50 hover:bg-surface/40 focus:outline-none focus:ring-2 focus:ring-primary/50"
            onClick={() => navigate(action.to)}
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-[11px] font-black text-primary">
              {action.marker}
            </div>
            <div className="mt-2 text-sm font-semibold text-fg">{action.label}</div>
            <div className="text-xs text-fg-muted">{action.helper}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
