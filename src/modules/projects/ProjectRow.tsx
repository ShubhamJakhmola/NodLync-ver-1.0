import { useRef } from "react";
import StatusBadge from "../../components/StatusBadge";
import type { Project } from "../../types";

interface ProjectRowProps {
  project: Project;
  selected: boolean;
  checked: boolean;
  onToggleSelected: () => void;
  onSelect: () => void;
  onOpen: () => void;
}

const ProjectRow = ({
  project,
  selected,
  checked,
  onToggleSelected,
  onSelect,
  onOpen,
}: ProjectRowProps) => {
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleRowClick = () => {
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
      onOpen();
      return;
    }

    clickTimer.current = setTimeout(() => {
      clickTimer.current = null;
      onSelect();
    }, 220);
  };

  const formattedDate = project.created_at
    ? new Date(project.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : 'Unknown';

  return (
    <div
      className={`group border-b border-stroke/30 transition-all duration-150 relative ${
        selected
          ? "bg-primary/10 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-primary z-10"
          : "hover:bg-surface/50"
      }`}
    >
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 lg:gap-4 px-3 py-2">
        {/* Selection & Name Section */}
        <div className="flex items-center gap-3 lg:col-span-6 flex-1 min-w-0">
          <input
            type="checkbox"
            checked={checked}
            onChange={onToggleSelected}
            onClick={(event) => event.stopPropagation()}
            className="h-4 w-4 shrink-0 accent-primary cursor-pointer border-stroke-strong bg-background transition-all"
            aria-label={`Select ${project.name}`}
          />
          <button
            type="button"
            className="min-w-0 flex-1 text-left outline-none"
            onClick={handleRowClick}
            title="Single click to select / Double click to open full view."
          >
            <p className={`truncate text-sm font-bold transition-colors ${selected ? "text-primary" : "text-fg"}`}>
              {project.name}
            </p>
            <p className="truncate text-[11px] text-fg-muted mt-0.5 max-w-full lg:max-w-md">
              {project.description?.trim() ? project.description : "No description."}
            </p>
          </button>
        </div>

        {/* Status & Metadata (Desktop inline, Mobile grouped) */}
        <div className="flex items-center justify-between lg:justify-start gap-4 lg:gap-6 shrink-0 lg:w-[35%]">
          <div className="lg:w-28 shrink-0">
            <StatusBadge status={project.status} />
          </div>
          
          <div className="flex flex-col items-end lg:items-start shrink-0 lg:w-24">
            <span className="text-[10px] font-bold text-fg-muted uppercase tracking-tighter">{formattedDate}</span>
            <span className="lg:hidden text-[9px] font-medium text-fg-muted/40 uppercase tracking-widest leading-none">Modified</span>
          </div>

          <div className="flex lg:flex-1 shrink-0 items-center justify-end">
            <button
              type="button"
              className="btn-ghost px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest opacity-60 lg:opacity-40 group-hover:opacity-100 transition shadow-sm hover:bg-primary/20 hover:text-primary whitespace-nowrap"
              onClick={(event) => {
                event.stopPropagation();
                onOpen();
              }}
            >
              Manager ➔
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectRow;
