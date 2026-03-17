import StatusBadge from "../../components/StatusBadge";
import useAppStore from "../../store/useAppStore";

const DashboardOverview = () => {
  const projects = useAppStore((s) => s.projects);
  const activeCount = projects.filter((p) => p.status === "active").length;
  const draftCount = projects.filter((p) => p.status === "draft").length;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="glass-panel p-5 col-span-2">
        <p className="text-xl font-semibold mb-2">Dashboard</p>
        <p className="text-slate-400">
          Mirrors your WPF overview. Projects drive every other module.
        </p>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-surface rounded-lg border border-slate-800 p-4">
            <p className="text-sm text-slate-400">Total projects</p>
            <p className="text-2xl font-semibold">{projects.length}</p>
          </div>
          <div className="bg-surface rounded-lg border border-slate-800 p-4">
            <p className="text-sm text-slate-400">Active</p>
            <p className="text-2xl font-semibold text-emerald-300">
              {activeCount}
            </p>
          </div>
          <div className="bg-surface rounded-lg border border-slate-800 p-4">
            <p className="text-sm text-slate-400">Draft</p>
            <p className="text-2xl font-semibold text-amber-300">
              {draftCount}
            </p>
          </div>
        </div>
      </div>
      <div className="glass-panel p-5 space-y-3">
        <p className="text-sm text-slate-400">Recently accessed</p>
        {projects.slice(0, 4).map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between rounded-lg border border-slate-800 bg-surface px-3 py-2"
          >
            <div>
              <p className="font-medium">{p.name}</p>
              <p className="text-xs text-slate-500 truncate">
                {p.description}
              </p>
            </div>
            <StatusBadge status={p.status} />
          </div>
        ))}
        {projects.length === 0 && (
          <p className="text-sm text-slate-500">
            Create a project to populate your dashboard.
          </p>
        )}
      </div>
    </div>
  );
};

export default DashboardOverview;
