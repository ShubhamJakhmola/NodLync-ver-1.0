import { useState } from "react";
import type { TaskItem } from "../../../api/projectManagerApi";
import BulkDeleteBar from "../../../components/BulkDeleteBar";
import IndeterminateCheckbox from "../../../components/IndeterminateCheckbox";
import PaginationControls from "../../../components/PaginationControls";
import { useBulkSelection } from "../../../hooks/useBulkSelection";
import { usePagination } from "../../../hooks/usePagination";

interface Props {
  milestones: TaskItem[];
  projectId: string;
  userId: string;
  onAdd: (title: string) => Promise<void>;
  onToggle: (milestone: TaskItem) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onBulkDelete: (ids: string[]) => Promise<void>;
  busy?: boolean;
}

const MilestonesCard = ({ milestones, onAdd, onToggle, onDelete, onBulkDelete, busy }: Props) => {
  const [adding, setAdding] = useState(false);
  const [input, setInput] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const completedCount = milestones.filter((m) => m.status === "done").length;
  const pagination = usePagination(milestones);
  const selection = useBulkSelection(milestones, (milestone) => milestone.id);
  const pageState = selection.getPageState(pagination.paginatedItems);

  const handleAdd = async () => {
    if (!input.trim()) return;
    await onAdd(input.trim());
    setInput("");
    setAdding(false);
  };

  const handleToggle = async (m: TaskItem) => {
    setSavingId(m.id);
    await onToggle(m);
    setSavingId(null);
  };

  const handleBulkDelete = async () => {
    if (selection.selectedCount === 0) return;
    if (!window.confirm(`Delete ${selection.selectedCount} selected milestone(s)?`)) return;
    setBulkDeleting(true);
    await onBulkDelete(Array.from(selection.selectedIds));
    selection.clearSelection();
    setBulkDeleting(false);
  };

  return (
    <div className="glass-panel p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">Flag</span>
          <h3 className="font-semibold text-slate-200 text-sm">Milestones</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">{completedCount}/{milestones.length}</span>
          <button className="text-xs text-primary hover:text-primary/80 transition font-medium" onClick={() => setAdding((v) => !v)}>
            {adding ? "Cancel" : "+ Add"}
          </button>
        </div>
      </div>

      {adding ? (
        <div className="flex gap-2">
          <input
            autoFocus
            className="flex-1 rounded-lg border border-slate-700 bg-surface px-2.5 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary transition placeholder:text-slate-600"
            placeholder="Milestone title..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
              if (e.key === "Escape") setAdding(false);
            }}
          />
          <button className="btn-primary text-xs px-3" onClick={handleAdd} disabled={busy || !input.trim()}>
            Add
          </button>
        </div>
      ) : null}

      <BulkDeleteBar
        count={selection.selectedCount}
        label="milestones"
        onDelete={handleBulkDelete}
        onClear={selection.clearSelection}
        busy={bulkDeleting}
      />

      {milestones.length === 0 ? (
        <p className="text-xs text-slate-500 italic text-center py-4">No milestones yet. Add your first one above.</p>
      ) : (
        <>
          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-slate-500">
            <IndeterminateCheckbox
              checked={pageState.checked}
              indeterminate={pageState.indeterminate}
              onChange={() => selection.togglePage(pagination.paginatedItems)}
              ariaLabel="Select all visible milestones"
            />
            <span>Visible milestones</span>
          </div>
          <ul className="space-y-2">
            {pagination.paginatedItems.map((m) => {
              const done = m.status === "done";
              const isLoading = savingId === m.id;
              return (
                <li key={m.id} className="flex items-center gap-3 group rounded-lg px-1 py-1 hover:bg-slate-800/40 transition">
                  <input
                    type="checkbox"
                    checked={selection.isSelected(m.id)}
                    onChange={() => selection.toggleOne(m.id)}
                    className="h-4 w-4 accent-primary"
                    aria-label={`Select ${m.title}`}
                  />
                  <button
                    className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition ${done ? "bg-emerald-500 border-emerald-500" : "border-slate-600 hover:border-primary"} ${isLoading ? "opacity-50" : ""}`}
                    onClick={() => handleToggle(m)}
                    disabled={isLoading}
                    title={done ? "Mark incomplete" : "Mark complete"}
                  >
                    {done ? <span className="text-[10px] text-slate-900">?</span> : null}
                  </button>
                  <span className={`flex-1 text-sm leading-snug ${done ? "line-through text-slate-500" : "text-slate-200"}`}>{m.title}</span>
                  {m.due_date ? (
                    <span className="text-[10px] text-slate-600 hidden group-hover:inline">
                      {new Date(m.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  ) : null}
                  <button className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-rose-400 transition text-xs" onClick={() => onDelete(m.id)} title="Delete">×</button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {milestones.length > 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/20">
          <PaginationControls
            currentPage={pagination.currentPage}
            pageSize={pagination.pageSize}
            totalItems={pagination.totalItems}
            totalPages={pagination.totalPages}
            startItem={pagination.startItem}
            endItem={pagination.endItem}
            onPageChange={pagination.setCurrentPage}
            onPageSizeChange={pagination.setPageSize}
            itemLabel="milestones"
          />
        </div>
      ) : null}

      {milestones.length > 0 ? (
        <div className="pt-2 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${milestones.length > 0 ? (completedCount / milestones.length) * 100 : 0}%` }} />
            </div>
            <span className="text-xs text-slate-500 tabular-nums">{milestones.length > 0 ? Math.round((completedCount / milestones.length) * 100) : 0}%</span>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default MilestonesCard;

