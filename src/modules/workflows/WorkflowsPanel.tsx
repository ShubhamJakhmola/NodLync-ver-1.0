const WorkflowsPanel = () => {
  return (
    <div className="glass-panel p-6 space-y-3">
      <p className="text-xl font-semibold">Workflows</p>
      <p className="text-sm text-slate-400">
        Recreate your workflow builder here. Keep the steps synced with the
        Projects module so automation remains contextual.
      </p>
      <div className="rounded-lg border border-slate-800 bg-surface px-4 py-3">
        <p className="text-sm font-medium text-slate-200">What to wire next</p>
        <p className="text-sm text-slate-400">
          Bind workflow rows to Supabase tables and drive execution with server
          functions or edge workers as you had in WPF.
        </p>
      </div>
    </div>
  );
};

export default WorkflowsPanel;
