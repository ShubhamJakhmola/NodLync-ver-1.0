import type { Project, ProjectStatus } from "../../../types";
import StatusBadge from "../../../components/StatusBadge";
import InlineSpinner from "../../../components/InlineSpinner";
import { useNavigate } from "react-router-dom";

interface Props {
  project: Project;
  progress: number; // 0–100
  onExport: () => void;
  onGenerateReport: () => void;
  onAddUpdate: () => void;
  saving?: boolean;
}

const STATUS_DOT: Record<ProjectStatus, string> = {
  draft: "bg-slate-400",
  active: "bg-emerald-400",
  paused: "bg-amber-400",
  archived: "bg-slate-600",
};

const ProjectHeader = ({
  project,
  progress,
  onExport,
  onGenerateReport,
  onAddUpdate,
  saving,
}: Props) => {
  const navigate = useNavigate();

  return (
    <div className="glass-panel px-6 py-5 space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <button
          onClick={() => navigate("/projects")}
          className="hover:text-slate-300 transition"
        >
          Projects
        </button>
        <span>›</span>
        <span className="text-slate-300 font-medium truncate max-w-xs">
          {project.name}
        </span>
      </div>

      {/* Title row */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-100 truncate">
              {project.name}
            </h1>
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${STATUS_DOT[project.status]}`}
              />
              <StatusBadge status={project.status} />
            </div>
            {saving && <InlineSpinner />}
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-3 max-w-md">
            <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-slate-300 tabular-nums w-9 text-right">
              {progress}%
            </span>
            <span className="text-xs text-slate-500">overall progress</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          <button
            className="btn-ghost text-sm flex items-center gap-1.5"
            onClick={onExport}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>
          <button
            className="btn-ghost text-sm flex items-center gap-1.5"
            onClick={onGenerateReport}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Generate Report
          </button>
          <button
            className="btn-primary text-sm flex items-center gap-1.5"
            onClick={onAddUpdate}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Update
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectHeader;
