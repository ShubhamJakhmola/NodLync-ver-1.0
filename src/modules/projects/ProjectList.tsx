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
  return (
    <div className="glass-panel h-full flex flex-col">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <p className="font-semibold">Projects</p>
        <button className="btn-primary text-sm" onClick={onCreate}>
          New Project
        </button>
      </div>
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800">
        {loading && (
          <div className="p-4">
            <InlineSpinner />
          </div>
        )}
        {!loading && projects.length === 0 && (
          <div className="p-4 text-sm text-slate-400 space-y-2">
            <p>No projects yet.</p>
            <button className="btn-primary text-sm" onClick={onCreate}>
              Create your first project
            </button>
          </div>
        )}
        {projects.map((project) => (
          <button
            key={project.id}
            className={`w-full text-left px-4 py-3 transition ${
              project.id === selectedId
                ? "bg-primary/10 text-primary"
                : "hover:bg-slate-800"
            }`}
            onClick={() => onSelect(project)}
          >
            <div className="flex items-center justify-between">
              <p className="font-medium">{project.name}</p>
              <StatusBadge status={project.status} />
            </div>
            <p className="text-xs text-slate-400 truncate">
              {project.description}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ProjectList;
