import type { WorkflowsRow } from "../../api/workflowsApi";

export default function DashboardWorkflowsCard({
  workflows,
  title = "Workflows",
  viewAllLabel = "View All",
}: {
  workflows: WorkflowsRow[];
  title?: string;
  viewAllLabel?: string;
}) {
  return (
    <div className="glass-panel p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">⚙️</span>
          <h3 className="font-semibold text-slate-200 text-sm">{title}</h3>
        </div>
        <button type="button" className="btn-ghost text-xs" disabled>
          {viewAllLabel}
        </button>
      </div>

      <div className="space-y-3">
        {workflows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-800/60 p-6 text-sm text-slate-500">
            No workflows found. Create one in the Workflows section.
          </div>
        ) : (
          workflows.slice(0, 4).map((w) => (
            <div
              key={w.id}
              className="rounded-xl border border-slate-800/60 bg-slate-950/10 p-4 flex items-start justify-between gap-4"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-100 truncate">{w.name}</p>
                <p className="text-xs text-slate-400">
                  {w.parent_id ? "Folder" : "Root"} • {new Date(w.created_at).toLocaleDateString("en-US")}
                </p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full border border-emerald-700/60 text-emerald-200 bg-emerald-900/30">
                ACTIVE
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

