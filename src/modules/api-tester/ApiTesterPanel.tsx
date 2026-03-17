const ApiTesterPanel = () => {
  return (
    <div className="glass-panel p-6 space-y-3">
      <p className="text-xl font-semibold">API Tester</p>
      <p className="text-sm text-slate-400">
        Use this area to port the WPF tester UI. Hook it to axios + Supabase
        token storage to run real requests from the browser.
      </p>
      <div className="rounded-lg border border-slate-800 bg-surface px-4 py-3">
        <p className="text-sm text-slate-200 font-medium">Ready endpoints</p>
        <ul className="list-disc list-inside text-slate-400 text-sm space-y-1">
          <li>
            Store auth tokens in Supabase and reuse them for test calls.
          </li>
          <li>Map responses to the same layout you used in WPF.</li>
        </ul>
      </div>
    </div>
  );
};

export default ApiTesterPanel;
