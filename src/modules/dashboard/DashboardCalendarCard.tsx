import { useMemo } from "react";

function buildMonthGrid(year: number, monthIndex: number) {
  const first = new Date(year, monthIndex, 1);
  const startWeekday = first.getDay(); // 0=Sun

  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const totalCells = 42; // 6 weeks

  const cells: Array<{ day: number | null }> = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startWeekday + 1;
    cells.push({ day: dayNum >= 1 && dayNum <= daysInMonth ? dayNum : null });
  }
  return cells;
}

export default function DashboardCalendarCard({
  highlightedDays,
  year,
  monthIndex,
}: {
  highlightedDays: Set<number>;
  year: number;
  monthIndex: number; // 0-11
}) {
  const monthLabel = useMemo(() => {
    const d = new Date(year, monthIndex, 1);
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }, [year, monthIndex]);

  const cells = useMemo(() => buildMonthGrid(year, monthIndex), [year, monthIndex]);

  const dayNames = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div className="glass-panel p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">📅</span>
          <h3 className="font-semibold text-slate-200 text-sm">{monthLabel}</h3>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="btn-ghost text-xs" disabled>
            ←
          </button>
          <button type="button" className="btn-ghost text-xs" disabled>
            →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-xs text-slate-500">
        {dayNames.map((n, idx) => (
          <div key={`${n}-${idx}`} className="text-center">
            {n}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 text-sm">
        {cells.map((c, idx) => {
          if (!c.day) {
            return <div key={idx} className="h-9" />;
          }
          const isHighlighted = highlightedDays.has(c.day);
          return (
            <div
              key={idx}
              className={`h-9 flex items-center justify-center rounded-lg border border-transparent ${
                isHighlighted ? "bg-primary/15 border-primary/40 text-primary" : "text-slate-300 hover:bg-slate-800/30"
              }`}
            >
              {c.day}
            </div>
          );
        })}
      </div>
    </div>
  );
}

