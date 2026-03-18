interface ApiVaultPopupProps {
  message: string;
  onClose: () => void;
}

const ApiVaultPopup = ({ message, onClose }: ApiVaultPopupProps) => {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-slate-950/55" onClick={onClose} />
      <div className="glass-panel relative w-full max-w-md border-rose-500/30 bg-slate-900 p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-100">Unable to save key</h3>
            <p className="mt-2 text-sm text-slate-300">{message}</p>
          </div>
          <button type="button" onClick={onClose} className="btn-ghost px-3 py-1.5 text-xs">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApiVaultPopup;
