interface ApiVaultActionsProps {
  isVisible: boolean;
  onToggleReveal: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onIntrospect: () => void;
  isProbing?: boolean;
}

const ApiVaultActions = ({
  isVisible,
  onToggleReveal,
  onCopy,
  onDelete,
  onIntrospect,
  isProbing,
}: ApiVaultActionsProps) => {
  return (
    <div className="flex items-center justify-end gap-2 pr-2">
      <button 
        type="button" 
        onClick={onIntrospect} 
        disabled={isProbing}
        title="Introspect Provider"
        className={`btn-ghost p-1.5 text-xs transition ${isProbing ? 'text-amber-400 animate-pulse' : 'text-fg-muted hover:text-sky-400'}`}
      >
        {isProbing ? "Probing..." : "Introspect"}
      </button>
      <button 
        type="button" 
        onClick={onToggleReveal} 
        title={isVisible ? "Hide Key" : "Reveal Key"}
        className="btn-ghost p-1.5 text-xs text-fg-muted hover:text-primary transition"
      >
        {isVisible ? "Hide" : "Reveal"}
      </button>
      <button 
        type="button" 
        onClick={onCopy} 
        title="Copy to clipboard"
        className="btn-ghost p-1.5 text-xs text-fg-muted hover:text-emerald-400 transition"
      >
        Copy
      </button>
      <button
        type="button"
        onClick={onDelete}
        title="Delete Item"
        className="inline-flex items-center justify-center rounded-lg border border-rose-800/40 p-1.5 text-[10px] font-bold uppercase tracking-widest text-rose-300 transition hover:bg-rose-500/10 hover:border-rose-500/60"
      >
        Delete
      </button>
    </div>
  );
};

export default ApiVaultActions;
