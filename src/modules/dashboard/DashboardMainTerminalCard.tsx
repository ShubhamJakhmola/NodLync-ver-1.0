import useAppStore from "../../store/useAppStore";

function safeString(v: unknown) {
  if (v == null) return "";
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

export default function DashboardMainTerminalCard() {
  const appLogs = useAppStore((s) => s.appLogs);

  return (
    <div className="glass-panel p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">💻</span>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Main System Terminal</p>
            <p className="text-[11px] text-slate-500">Recent activity</p>
          </div>
        </div>
        <div className="text-xs text-slate-500 font-mono">{appLogs.length ? `${Math.min(6, appLogs.length)} shown` : "empty"}</div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/20 p-3">
        {appLogs.length === 0 ? (
          <div className="text-sm text-slate-500">No system logs yet. Open Settings → System Logs to view.</div>
        ) : (
          <div className="font-mono text-[12px] leading-relaxed text-slate-300 space-y-2">
            {appLogs.slice(0, 6).map((log: any) => (
              <div key={log.id ?? Math.random()} className="flex gap-3">
                <span className="text-slate-500 shrink-0">
                  {log.created_at ? String(new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })) : "—"}
                </span>
                <span className={log.status === "success" ? "text-emerald-300" : log.status === "error" ? "text-rose-300" : "text-slate-300"}>
                  [{safeString(log.status)}] {safeString(log.action)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

