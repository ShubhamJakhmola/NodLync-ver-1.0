interface ApiVaultActionsProps {
  isVisible: boolean;
  isDeleting: boolean;
  onToggleReveal: () => void;
  onCopy: () => void;
  onDelete: () => void;
}

const ApiVaultActions = ({
  isVisible,
  isDeleting,
  onToggleReveal,
  onCopy,
  onDelete,
}: ApiVaultActionsProps) => {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <button type="button" onClick={onToggleReveal} className="btn-ghost px-3 py-1.5 text-xs">
        {isVisible ? "Hide" : "Reveal"}
      </button>
      <button type="button" onClick={onCopy} className="btn-ghost px-3 py-1.5 text-xs">
        Copy API Key
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="inline-flex items-center justify-center rounded-lg border border-rose-500/30 px-3 py-1.5 text-xs text-rose-300 transition hover:bg-rose-500/10 disabled:opacity-60"
        disabled={isDeleting}
      >
        {isDeleting ? "Deleting..." : "Delete"}
      </button>
    </div>
  );
};

export default ApiVaultActions;
