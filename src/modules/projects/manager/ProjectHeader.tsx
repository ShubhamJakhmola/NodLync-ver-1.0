import { useNavigate } from "react-router-dom";
import StatusBadge from "../../../components/StatusBadge";
import InlineSpinner from "../../../components/InlineSpinner";
import type { Project, ProjectStatus } from "../../../types";

interface Props {
  project: Project;
  progress: number;
  onExport: () => void;
  onGenerateReport: () => void;
  onAddUpdate: () => void;
  onSaveToStuff?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  saving?: boolean;
  savingToStuff?: boolean;
}

const STATUS_DOT: Record<ProjectStatus, string> = {
  draft: "bg-fg-muted",
  active: "bg-emerald-400",
  in_progress: "bg-blue-400",
  completed: "bg-emerald-500",
  archived: "bg-surface",
};

const ProjectHeader = ({
  project,
  progress,
  onExport,
  onGenerateReport,
  onAddUpdate,
  onSaveToStuff,
  onRefresh,
  refreshing = false,
  saving,
  savingToStuff = false,
}: Props) => {
  const navigate = useNavigate();

  return (
    <div className="glass-panel space-y-4 px-6 py-5">
      <div className="flex items-center gap-2 text-xs text-fg-muted">
        <button
          type="button"
          onClick={() => navigate("/projects")}
          className="transition hover:text-fg-secondary"
        >
          Projects
        </button>
        <span>{">"}</span>
        <span className="max-w-xs truncate font-medium text-fg-secondary">
          {project.name}
        </span>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="truncate text-2xl font-bold text-fg">{project.name}</h1>
            <div className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${STATUS_DOT[project.status]}`} />
              <StatusBadge status={project.status} />
            </div>
            {saving && <InlineSpinner compact />}
          </div>

          <div className="flex max-w-md items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-[width] duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="w-9 text-right text-sm font-semibold tabular-nums text-fg-secondary">
              {progress}%
            </span>
            <span className="text-xs text-fg-muted">overall progress</span>
          </div>
        </div>

        <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn-ghost flex items-center gap-1.5 text-sm"
            onClick={onRefresh ?? (() => window.location.reload())}
            disabled={refreshing}
            title="Refresh project"
          >
            <span className={`text-lg leading-none ${refreshing ? "animate-spin" : ""}`}>
              ⭮
            </span>
            Refresh
          </button>
          <button className="btn-ghost flex items-center gap-1.5 text-sm" onClick={onExport}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>
          <button
            className="btn-ghost flex items-center gap-1.5 text-sm"
            onClick={onGenerateReport}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Generate Report
          </button>
          {onSaveToStuff ? (
            <button
              className="btn-ghost flex items-center gap-1.5 text-sm"
              onClick={onSaveToStuff}
              disabled={savingToStuff}
            >
              {savingToStuff ? "Saving..." : "Save to My Stuff"}
            </button>
          ) : null}
          <button
            className="btn-primary flex items-center gap-1.5 text-sm"
            onClick={onAddUpdate}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
