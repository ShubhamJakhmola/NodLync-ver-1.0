import { useNavigate } from "react-router-dom";
import BulkDeleteBar from "../../components/BulkDeleteBar";
import IndeterminateCheckbox from "../../components/IndeterminateCheckbox";
import InlineSpinner from "../../components/InlineSpinner";
import PaginationControls from "../../components/PaginationControls";
import { useBulkSelection } from "../../hooks/useBulkSelection";
import { usePagination } from "../../hooks/usePagination";
import type { Project, ProjectStatus } from "../../types";
import ProjectRow from "./ProjectRow";

import { useProjectSearch } from "../../hooks/useProjectSearch";

interface Props {
  projects: Project[];
  selectedId?: string;
  onSelect: (project: Project) => void;
  onCreate: () => void;
  onDeleteSelected: (ids: string[]) => Promise<void>;
  onBulkStatusUpdate?: (ids: string[], status: ProjectStatus) => Promise<void>;
  loading: boolean;
  bulkDeleting?: boolean;
}

const ProjectList = ({
  projects,
  selectedId,
  onSelect,
  onCreate,
  onDeleteSelected,
  onBulkStatusUpdate,
  loading,
  bulkDeleting,
}: Props) => {
  const navigate = useNavigate();
  const {
    filteredProjects,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy,
  } = useProjectSearch(projects);

  const pagination = usePagination(filteredProjects);
  const selection = useBulkSelection(filteredProjects, (project) => project.id);
  const pageState = selection.getPageState(pagination.paginatedItems);

  const handleBulkDelete = async () => {
    if (selection.selectedCount === 0) return;
    const confirmed = window.confirm(`Permanently delete ${selection.selectedCount} selected project(s)?`);
    if (!confirmed) return;
    await onDeleteSelected(Array.from(selection.selectedIds));
    selection.clearSelection();
  };

  return (
    <div className="relative z-0 flex h-full flex-col border border-stroke/40 rounded-xl bg-surface/5 overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-stroke/20 px-3 py-2 bg-surface/10">
        <p className="text-[10px] font-black uppercase tracking-widest text-fg-muted">Project Registry</p>
        <button
          type="button"
          className="btn-primary relative z-10 text-sm"
          onClick={onCreate}
          title="Create a new project"
        >
          + New Project
        </button>
      </div>

      <div className="flex flex-col gap-3 border-b border-stroke px-2 py-3 bg-surface/10">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-2.5 flex items-center text-fg-muted text-[10px]">SEARCH</span>
          <input
            type="text"
            placeholder="Find projects..."
            className="w-full rounded-md border border-stroke bg-surface py-1.5 pl-14 pr-3 text-xs focus:border-primary/50 focus:ring-0"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-black uppercase text-fg-muted">Status</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-surface/50 border border-stroke/50 rounded-lg px-2 py-1 text-[10px] font-bold text-fg-secondary focus:ring-0 cursor-pointer appearance-none"
              >
                <option value="all">All</option>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-black uppercase text-fg-muted">Sort</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-surface/50 border border-stroke/50 rounded-lg px-2 py-1 text-[10px] font-bold text-fg-secondary focus:ring-0 cursor-pointer appearance-none"
              >
                <option value="updated">Recent</option>
                <option value="name">AZ</option>
                <option value="status">Level</option>
              </select>
            </div>
          </div>

          <button onClick={onCreate} className="text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 px-2 py-1 rounded transition">+ NEW</button>
        </div>
      </div>

      <div className="px-2 pt-2">
        <BulkDeleteBar
          count={selection.selectedCount}
          label="projects"
          onDelete={handleBulkDelete}
          onClear={selection.clearSelection}
          busy={bulkDeleting}
        />
        {selection.selectedCount > 0 && onBulkStatusUpdate && (
          <div className="mt-1 flex flex-wrap items-center gap-1.5 animate-in slide-in-from-top-1 px-1">
            <span className="text-[8px] font-black uppercase text-fg-muted">UPDATE:</span>
            {["draft", "active", "in_progress", "completed", "archived"].map((st) => (
              <button
                key={st}
                onClick={() => onBulkStatusUpdate(Array.from(selection.selectedIds), st as any)}
                className="text-[9px] font-bold text-fg-muted hover:text-primary transition-colors"
              >
                {st.split("_").map(s => s[0]).join("")}
              </button>
            ))}
          </div>
        )}
      </div>

      {projects.length > 0 ? (
        <div className="flex items-center gap-2 px-3 pt-3 pb-1 text-[10px] font-bold text-fg-muted uppercase tracking-tighter opacity-60">
          <IndeterminateCheckbox
            checked={pageState.checked}
            indeterminate={pageState.indeterminate}
            onChange={() => selection.togglePage(pagination.paginatedItems)}
            ariaLabel="Select all"
          />
          <span>Select all</span>
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="flex items-center gap-2 p-4 text-sm text-fg-muted">
            <InlineSpinner />
            <span>Loading projects...</span>
          </div>
        ) : null}

        {!loading && projects.length > 0 && filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center space-y-3 p-10 text-center animate-in fade-in zoom-in-95 duration-500">
            <div className="text-4xl grayscale opacity-50">🔍</div>
            <p className="font-bold text-fg-secondary">No matching projects</p>
            <p className="text-xs text-fg-muted max-w-[200px] mx-auto">
              We couldn't find anything matching "{searchQuery}" with the current filters.
            </p>
            <button
              type="button"
              className="text-xs font-bold text-primary hover:underline uppercase tracking-widest pt-2"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
              }}
            >
              Reset Filters
            </button>
          </div>
        ) : null}

        {!loading && projects.length === 0 ? (
          <div className="flex flex-col items-center space-y-4 p-12 text-center border-2 border-dashed border-stroke rounded-2xl animate-in fade-in duration-700">
            <div className="text-5xl opacity-80">📁</div>
            <div className="space-y-1">
              <p className="font-black text-lg text-fg tracking-tight">Your workspace is empty</p>
              <p className="text-sm text-fg-muted max-w-[240px]">Create your first high-performance project to start tracking your AI Ops.</p>
            </div>
            <button type="button" className="btn-primary px-8 py-3 text-sm font-black uppercase tracking-widest shadow-xl shadow-primary/20" onClick={onCreate}>
              + Create Project
            </button>
          </div>
        ) : null}

        {!loading
          ? pagination.paginatedItems.map((project) => (
            <ProjectRow
              key={project.id}
              project={project}
              selected={project.id === selectedId}
              checked={selection.isSelected(project.id)}
              onToggleSelected={() => selection.toggleOne(project.id)}
              onSelect={() => onSelect(project)}
              onOpen={() => navigate(`/projects/${project.id}`)}
            />
          ))
          : null}
      </div>

      {filteredProjects.length > 0 ? (
        <>
          <PaginationControls
            currentPage={pagination.currentPage}
            pageSize={pagination.pageSize}
            totalItems={pagination.totalItems}
            totalPages={pagination.totalPages}
            startItem={pagination.startItem}
            endItem={pagination.endItem}
            onPageChange={pagination.setCurrentPage}
            onPageSizeChange={pagination.setPageSize}
            itemLabel="projects"
          />
        </>
      ) : null}
    </div>
  );
};

export default ProjectList;
