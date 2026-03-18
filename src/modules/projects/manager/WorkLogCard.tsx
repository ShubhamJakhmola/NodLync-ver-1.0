import { useState } from "react";
import type { DailyLogPayload } from "../../../api/projectManagerApi";

interface Props {
  onSubmit: (log: DailyLogPayload) => Promise<void>;
  busy?: boolean;
  lastSubmitted?: string | null; // ISO timestamp of last log
}

const empty: DailyLogPayload = {
  completed: "",
  next_steps: "",
  blockers: "",
  notes: "",
};

const WorkLogCard = ({ onSubmit, busy, lastSubmitted }: Props) => {
  const [log, setLog] = useState<DailyLogPayload>(empty);
  const [submitted, setSubmitted] = useState(false);

  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const set = (key: keyof DailyLogPayload) => (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setLog((prev) => ({ ...prev, [key]: e.target.value }));
    if (submitted) setSubmitted(false);
  };

  const handleSubmit = async () => {
    if (!log.completed.trim() && !log.next_steps.trim()) return;
    await onSubmit(log);
    setLog(empty);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  const hasBlockers = log.blockers.trim().length > 0;

  return (
    <div className="glass-panel p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">📋</span>
          <h3 className="font-semibold text-slate-200">Today's Work Log</h3>
        </div>
        <span className="text-xs text-slate-500">{today}</span>
      </div>

      {lastSubmitted && (
        <div className="text-xs text-emerald-400 bg-emerald-900/20 border border-emerald-800 rounded-lg px-3 py-1.5">
          ✓ Last log posted at{" "}
          {new Date(lastSubmitted).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      )}

      {/* 2-column textarea grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Completed Work */}
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Completed Work
          </span>
          <textarea
            rows={4}
            className="w-full rounded-lg border border-slate-700 bg-surface px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary transition resize-none placeholder:text-slate-600"
            placeholder="What did you finish today?"
            value={log.completed}
            onChange={set("completed")}
          />
        </label>

        {/* Next Steps */}
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Next Steps
          </span>
          <textarea
            rows={4}
            className="w-full rounded-lg border border-slate-700 bg-surface px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary transition resize-none placeholder:text-slate-600"
            placeholder="What's on the list for tomorrow?"
            value={log.next_steps}
            onChange={set("next_steps")}
          />
        </label>

        {/* Blockers — highlighted if filled */}
        <label className="block space-y-1.5">
          <span
            className={`text-xs font-semibold uppercase tracking-wide transition ${
              hasBlockers ? "text-rose-400" : "text-slate-400"
            }`}
          >
            Blockers {hasBlockers && "⚠"}
          </span>
          <textarea
            rows={4}
            className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 transition resize-none placeholder:text-slate-600 bg-surface ${
              hasBlockers
                ? "border-rose-700 focus:ring-rose-500 bg-rose-900/10"
                : "border-slate-700 focus:ring-primary"
            }`}
            placeholder="Any issues holding you back?"
            value={log.blockers}
            onChange={set("blockers")}
          />
        </label>

        {/* Notes */}
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Notes / Misc
          </span>
          <textarea
            rows={4}
            className="w-full rounded-lg border border-slate-700 bg-surface px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary transition resize-none placeholder:text-slate-600"
            placeholder="Additional thoughts..."
            value={log.notes}
            onChange={set("notes")}
          />
        </label>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1">
        <div className="text-xs text-slate-600">
          Logs are saved per project and visible in the Activity feed.
        </div>
        <div className="flex items-center gap-3">
          {submitted && (
            <span className="text-xs text-emerald-400 flex items-center gap-1">
              <span>✓</span> Log posted!
            </span>
          )}
          <button
            className="btn-primary text-sm"
            onClick={handleSubmit}
            disabled={busy || (!log.completed.trim() && !log.next_steps.trim())}
          >
            {busy ? "Posting..." : "Post Daily Log"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkLogCard;
