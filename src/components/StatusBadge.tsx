import type { ProjectStatus } from "../types";

const variants: Record<string, string> = {
  draft: "bg-panel text-fg-secondary border-stroke uppercase text-[10px] tracking-widest",
  active: "bg-emerald-900/40 text-emerald-200 border-emerald-700 uppercase text-[10px] tracking-widest",
  in_progress: "bg-blue-900/40 text-blue-200 border-blue-700 uppercase text-[10px] tracking-widest",
  completed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 uppercase text-[10px] tracking-widest",
  archived: "bg-panel/60 text-fg-muted border-stroke/60 uppercase text-[10px] tracking-widest",
};

const StatusBadge = ({ status }: { status: ProjectStatus }) => {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
        variants[status] ?? "bg-panel text-fg-secondary border-stroke"
      }`}
    >
      {status}
    </span>
  );
};

export default StatusBadge;
