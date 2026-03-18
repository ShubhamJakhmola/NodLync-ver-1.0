import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import type { Project } from "../../types";
import StatusBadge from "../../components/StatusBadge";
import InlineSpinner from "../../components/InlineSpinner";

interface Props {
  projects: Project[];
  selectedId?: string;
  onSelect: (project: Project) => void;
  onCreate: () => void;
  loading: boolean;
}

const ProjectList = ({
  projects,
  selectedId,
  onSelect,
  onCreate,
  loading,
}: Props) => {
  const navigate = useNavigate();
  // Track click timers per project to distinguish single vs double click
  const clickTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const handleClick = (project: Project) => {
    // If there's already a pending timer for this project, it's a double click
    if (clickTimers.current[project.id]) {
      clearTimeout(clickTimers.current[project.id]);
      delete clickTimers.current[project.id];
      // Double click → navigate to full manager page
      navigate(`/projects/${project.id}`);
    } else {
      // Set a timer; if no second click comes, treat as single click
      clickTimers.current[project.id] = setTimeout(() => {
        delete clickTimers.current[project.id];
        // Single click → open in right panel
        onSelect(project);
      }, 250);
    }
  };

  return (
    <div className="glass-panel h-full flex flex-col">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <p className="font-semibold">Projects</p>
        <button
          className="btn-primary text-sm"
          onClick={onCreate}
          title="Create a new project"
        >
          + New
        </button>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-slate-800">
        {loading && (
          <div className="p-4 flex items-center gap-2 text-sm text-slate-400">
            <InlineSpinner />
            <span>Loading projects...</span>
          </div>
        )}

        {!loading && projects.length === 0 && (
          <div className="p-6 text-sm text-slate-400 space-y-3 flex flex-col items-center text-center">
            <div className="text-3xl">📁</div>
            <p className="font-medium text-slate-300">No projects yet</p>
            <p>Create your first project to get started.</p>
            <button className="btn-primary text-sm" onClick={onCreate}>
              Create project
            </button>
          </div>
        )}

        {projects.map((project) => {
          const isSelected = project.id === selectedId;
          return (
            <button
              key={project.id}
              className={`w-full text-left px-4 py-3 transition-all duration-150 outline-none group relative ${
                isSelected
                  ? "bg-primary/10 border-l-2 border-primary"
                  : "hover:bg-slate-800/70 border-l-2 border-transparent"
              }`}
              onClick={() => handleClick(project)}
              title="Single click to edit · Double click to open full view"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <p
                  className={`font-medium truncate text-sm ${
                    isSelected ? "text-primary" : "text-slate-200"
                  }`}
                >
                  {project.name}
                </p>
                <StatusBadge status={project.status} />
              </div>
              {project.description && (
                <p className="text-xs text-slate-400 truncate leading-relaxed">
                  {project.description}
                </p>
              )}
              {/* Subtle hint on hover */}
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-600 group-hover:text-slate-500 transition-opacity opacity-0 group-hover:opacity-100 pointer-events-none select-none">
                dbl-click → full view
              </span>
            </button>
          );
        })}
      </div>

      {projects.length > 0 && (
        <div className="border-t border-slate-800 px-4 py-2 text-xs text-slate-500">
          {projects.length} project{projects.length !== 1 ? "s" : ""} ·{" "}
          <span className="text-slate-600">single click = edit · double click = full view</span>
        </div>
      )}
    </div>
  );
};

export default ProjectList;
