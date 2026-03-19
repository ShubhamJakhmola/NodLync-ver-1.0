import React from "react";

export type StatTone = "primary" | "emerald" | "amber" | "rose" | "slate";

const toneClasses: Record<StatTone, { value: string; glow: string }> = {
  primary: { value: "text-primary", glow: "shadow-[0_0_24px_rgba(99,102,241,0.25)]" },
  emerald: { value: "text-emerald-300", glow: "shadow-[0_0_24px_rgba(16,185,129,0.18)]" },
  amber: { value: "text-amber-300", glow: "shadow-[0_0_24px_rgba(245,158,11,0.18)]" },
  rose: { value: "text-rose-300", glow: "shadow-[0_0_24px_rgba(244,63,94,0.18)]" },
  slate: { value: "text-slate-300", glow: "" },
};

export default function DashboardStatCard({
  icon,
  label,
  value,
  tone = "primary",
  meta,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  tone?: StatTone;
  meta?: string;
}) {
  const toneCls = toneClasses[tone];
  return (
    <div className="glass-panel p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`rounded-lg border border-slate-700/60 bg-surface/40 p-2`}>{icon}</div>
          <div className="min-w-0">
            <p className="text-sm text-slate-400">{label}</p>
          </div>
        </div>
        {meta ? (
          <span className="text-xs text-slate-400 bg-slate-800/40 border border-slate-700/60 px-2 py-1 rounded-full">
            {meta}
          </span>
        ) : null}
      </div>
      <div className={`mt-3 text-3xl font-bold ${toneCls.value} ${toneCls.glow}`}>{value}</div>
    </div>
  );
}

