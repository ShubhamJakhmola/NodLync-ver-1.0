const AiPlaygroundPanel = () => {
  return (
    <div className="glass-panel p-6 space-y-3">
      <p className="text-xl font-semibold">AI Playground</p>
      <p className="text-sm text-slate-400">
        Drop your existing prompt/response panels here. The route is wired; plug
        in your AI provider client to mirror the desktop experience.
      </p>
      <div className="rounded-lg border border-slate-800 bg-surface px-4 py-3 space-y-2">
        <p className="text-sm font-medium text-slate-200">Integration tips</p>
        <p className="text-sm text-slate-400">
          Use the selected project to scope history and store transcripts in
          Supabase for continuity across desktop and web.
        </p>
      </div>
    </div>
  );
};

export default AiPlaygroundPanel;
