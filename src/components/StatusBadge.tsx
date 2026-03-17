import type { ProjectStatus } from "../types";

const variants: Record<string, string> = {
  draft: "bg-slate-800 text-slate-200 border-slate-700",
  active: "bg-emerald-900/40 text-emerald-200 border-emerald-700",
  paused: "bg-amber-900/40 text-amber-200 border-amber-700",
  archived: "bg-slate-900 text-slate-400 border-slate-800",
};

const StatusBadge = ({ status }: { status: ProjectStatus }) => {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
        variants[status] ?? "bg-slate-800 text-slate-200 border-slate-700"
      }`}
    >
      {status}
    </span>
  );
};

export default StatusBadge;
