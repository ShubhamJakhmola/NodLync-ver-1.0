import { useState } from "react";
import type { Milestone } from "../../../api/projectManagerApi";
import BulkDeleteBar from "../../../components/BulkDeleteBar";
import IndeterminateCheckbox from "../../../components/IndeterminateCheckbox";
import PaginationControls from "../../../components/PaginationControls";
import { useBulkSelection } from "../../../hooks/useBulkSelection";
import { usePagination } from "../../../hooks/usePagination";

interface Props {
  milestones: Milestone[];
  projectId: string;
  userId: string;
  onAdd: (payload: { title: string; deadline?: string | null }) => Promise<void>;
  onToggle: (milestone: Milestone) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onBulkDelete: (ids: string[]) => Promise<void>;
  busy?: boolean;
}

const MilestonesCard = ({ milestones, onAdd, onToggle, onDelete, onBulkDelete, busy }: Props) => {
  const [adding, setAdding] = useState(false);
  const [input, setInput] = useState("");
  const [deadline, setDeadline] = useState<string>("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const formatDeadline = (d: string | null | undefined) => {
    if (!d) return null;
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return d;
    return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };
  
  const completedCount = milestones.filter((m) => m.status === "completed").length;
  const pagination = usePagination(milestones);
  const selection = useBulkSelection(milestones, (m) => m.id);
  const pageState = selection.getPageState(pagination.paginatedItems);

  const handleAdd = async () => {
    if (!input.trim()) return;
    await onAdd({
      title: input.trim(),
      deadline: deadline ? deadline : null,
    });
    setInput("");
    setDeadline("");
    setAdding(false);
  };

  const handleToggle = async (m: Milestone) => {
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
          <span className="text-base text-primary">🚩</span>
          <h3 className="font-semibold text-slate-200 text-sm">Strategic Milestones</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">{completedCount}/{milestones.length} Done</span>
          <button className="text-xs text-primary hover:text-primary/80 transition font-bold" onClick={() => setAdding((v) => !v)}>
            {adding ? "CANCEL" : "+ ADD"}
          </button>
        </div>
      </div>

      {adding && (
        <div className="flex gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
          <input
            autoFocus
            className="flex-1 rounded-lg border border-slate-700 bg-surface px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary transition placeholder:text-slate-600"
            placeholder="Enter milestone name..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
              if (e.key === "Escape") setAdding(false);
            }}
          />
          <input
            type="date"
            className="w-36 rounded-lg border border-slate-700 bg-surface px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary transition placeholder:text-slate-600"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            aria-label="Milestone deadline"
          />
          <button className="btn-primary text-xs px-4" onClick={handleAdd} disabled={busy || !input.trim()}>
            ADD
          </button>
        </div>
      )}

      <BulkDeleteBar
        count={selection.selectedCount}
        label="milestones"
        onDelete={handleBulkDelete}
        onClear={selection.clearSelection}
        busy={bulkDeleting}
      />

      {milestones.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-slate-800 rounded-xl">
          <p className="text-xs text-slate-600">No milestones defined for this project.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-[10px] uppercase font-bold tracking-widest text-slate-600 px-1">
            <IndeterminateCheckbox
              checked={pageState.checked}
              indeterminate={pageState.indeterminate}
              onChange={() => selection.togglePage(pagination.paginatedItems)}
              ariaLabel="Select all visible milestones"
            />
            <span>Select All Visible</span>
          </div>
          <ul className="space-y-1">
            {pagination.paginatedItems.map((m) => {
              const isCompleted = m.status === "completed";
              const isLoading = savingId === m.id;
              return (
                <li key={m.id} className="flex items-center gap-3 group rounded-lg px-2 py-2 hover:bg-slate-800/30 transition border border-transparent hover:border-slate-800/50">
                  <input
                    type="checkbox"
                    checked={selection.isSelected(m.id)}
                    onChange={() => selection.toggleOne(m.id)}
                    className="h-3.5 w-3.5 accent-primary rounded bg-slate-900 border-slate-700"
                  />
                  <span className={`flex-1 text-sm leading-snug font-medium ${isCompleted ? "line-through text-slate-600" : "text-slate-300"}`}>
                    {m.title}
                  </span>
                  {m.deadline && (
                    <span className="text-[10px] text-slate-500 font-mono opacity-80">
                      Due {formatDeadline(m.deadline)}
                    </span>
                  )}
                  <button 
                    className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-rose-500 transition-all p-1" 
                    onClick={() => onDelete(m.id)} 
                    title="Delete Milestone"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  <button
                    className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center transition border ${isCompleted ? "bg-emerald-500/10 border-emerald-500 text-emerald-500" : "bg-slate-900 border-slate-700 text-slate-600 hover:border-primary"} ${isLoading ? "opacity-50" : ""}`}
                    onClick={() => handleToggle(m)}
                    disabled={isLoading}
                    title={isCompleted ? "Mark not done" : "Mark done"}
                  >
                    {isCompleted ? (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-700 group-white" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {milestones.length > 0 && (
        <div className="pt-4 border-t border-slate-800/50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Velocity</span>
            <span className="text-xs font-bold text-primary tabular-nums">{Math.round((completedCount / milestones.length) * 100)}%</span>
          </div>
          <div className="bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800">
            <div 
              className="h-full bg-gradient-to-r from-primary to-emerald-400 rounded-full transition-all duration-700" 
              style={{ width: `${(completedCount / milestones.length) * 100}%` }} 
            />
          </div>
          
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
      )}
    </div>
  );
};

export default MilestonesCard;

