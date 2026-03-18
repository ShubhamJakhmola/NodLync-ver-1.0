interface BulkDeleteBarProps {
  count: number;
  label: string;
  onDelete: () => void;
  onClear: () => void;
  busy?: boolean;
}

const BulkDeleteBar = ({
  count,
  label,
  onDelete,
  onClear,
  busy,
}: BulkDeleteBarProps) => {
  if (count === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3">
      <p className="text-sm text-rose-100">
        {count} {label} selected
      </p>
      <div className="flex items-center gap-2">
        <button type="button" onClick={onClear} className="btn-ghost px-3 py-1.5 text-xs">
          Clear
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          className="inline-flex items-center justify-center rounded-lg border border-rose-500/30 px-3 py-1.5 text-xs text-rose-200 transition hover:bg-rose-500/10 disabled:opacity-60"
        >
          {busy ? "Deleting..." : "Delete Selected"}
        </button>
      </div>
    </div>
  );
};

export default BulkDeleteBar;

