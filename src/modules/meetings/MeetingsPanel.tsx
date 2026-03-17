const MeetingsPanel = () => {
  return (
    <div className="glass-panel p-6 space-y-3">
      <p className="text-xl font-semibold">Meetings</p>
      <p className="text-sm text-slate-400">
        Aligns with your scheduling pane. Connect calendar APIs and store
        meeting notes per project once ready.
      </p>
      <div className="rounded-lg border border-slate-800 bg-surface px-4 py-3">
        <p className="text-sm font-medium text-slate-200">Placeholder data</p>
        <p className="text-sm text-slate-400">
          Populate from the same Supabase tables you used in WPF; UI is ready to
          receive real data.
        </p>
      </div>
    </div>
  );
};

export default MeetingsPanel;
