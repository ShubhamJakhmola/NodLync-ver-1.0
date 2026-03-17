import useAppStore from "../../store/useAppStore";

const ApiVaultPanel = () => {
  const projectName =
    useAppStore((s) => s.selectedProject?.name) ??
    useAppStore((s) => s.projects[0]?.name);

  return (
    <div className="glass-panel p-6 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xl font-semibold">API Vault</p>
        <span className="text-xs text-slate-400">
          Project context: {projectName ?? "Pick a project"}
        </span>
      </div>
      <p className="text-sm text-slate-400">
        Mirror of the WPF vault. Wire your API credentials per project. Hook
        this to Supabase tables the same way as desktop; forms align with
        Projects to keep schema consistent.
      </p>
      <div className="rounded-lg border border-slate-800 bg-surface px-4 py-3">
        <p className="text-sm font-medium text-slate-200">Next step</p>
        <p className="text-sm text-slate-400">
          Connect your existing vault table to render live keys here. Route is
          ready at <code className="text-primary">/api-vault</code>.
        </p>
      </div>
    </div>
  );
};

export default ApiVaultPanel;
