import PaginationControls from "../../../components/PaginationControls";
import { usePagination } from "../../../hooks/usePagination";
import type { ProjectActivity } from "../../../api/projectManagerApi";
import type { ProjectNote } from "../../../api/projectManagerApi";

// Combined feed item (activity or daily log)
interface FeedItem {
  id: string;
  type: "activity" | "log";
  action?: string;
  details?: string | null;
  content?: string;
  created_at: string;
}

interface Props {
  activities: ProjectActivity[];
  notes: ProjectNote[];
  compact?: boolean; // compact mode for right-sidebar
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `${days}d ago`;
  if (hrs > 0) return `${hrs}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return "Just now";
}

function parseDailyLog(content: string) {
  try {
    const parsed = JSON.parse(content);
    const parts: string[] = [];
    if (parsed.completed) parts.push(`✓ ${parsed.completed}`);
    if (parsed.next_steps) parts.push(`→ ${parsed.next_steps}`);
    if (parsed.blockers) parts.push(`⚠ ${parsed.blockers}`);
    return parts.join(" · ") || "Daily log posted";
  } catch {
    return content || "Daily log posted";
  }
}

const ActivityFeed = ({ activities, notes, compact = false }: Props) => {
  // Merge and sort
  const items: FeedItem[] = [
    ...activities.map((a) => ({
      id: a.id,
      type: "activity" as const,
      action: a.action,
      details: a.details,
      created_at: a.created_at,
    })),
    ...notes
      .filter((n) => n.note_type === "daily_log")
      .map((n) => ({
        id: n.id,
        type: "log" as const,
        action: "Posted daily log",
        content: n.content,
        created_at: n.created_at,
      })),
  ].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  if (items.length === 0) {
    return (
      <div className={`glass-panel p-5 ${compact ? "space-y-3" : "space-y-4"}`}>
        <div className="flex items-center gap-2">
          <span className="text-base">⚡</span>
          <h3 className={`font-semibold text-slate-200 ${compact ? "text-sm" : ""}`}>
            {compact ? "Activity" : "Recent History"}
          </h3>
        </div>
        <p className="text-xs text-slate-500 italic text-center py-4">
          No activity yet. Start by posting a work log!
        </p>
      </div>
    );
  }

  const pagination = usePagination(items);
  const displayItems = compact ? pagination.paginatedItems.slice(0, 4) : pagination.paginatedItems;

  return (
    <div className={`glass-panel p-5 ${compact ? "space-y-3" : "space-y-4"}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">⚡</span>
          <h3 className={`font-semibold text-slate-200 ${compact ? "text-sm" : ""}`}>
            {compact ? "Activity" : "Recent History"}
          </h3>
        </div>
        {!compact && (
          <span className="text-xs text-slate-500">{items.length} events</span>
        )}
      </div>

      {/* Timeline */}
      <ul className="space-y-0">
        {displayItems.map((item, idx) => {
          const isLog = item.type === "log";
          const isLast = idx === displayItems.length - 1;

          if (compact) {
            // Compact mode: simple list
            return (
              <li key={item.id} className="flex items-start gap-2.5 py-1.5">
                <div
                  className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                    isLog ? "bg-primary" : "bg-slate-500"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-slate-500 block">
                    {timeAgo(item.created_at)}
                  </span>
                  <p className="text-xs text-slate-300 truncate">
                    {isLog
                      ? `Daily log: ${parseDailyLog(item.content ?? "").slice(0, 60)}…`
                      : item.action}
                  </p>
                </div>
              </li>
            );
          }

          // Full mode: timeline with connector line
          return (
            <li key={item.id} className="flex gap-3 group">
              {/* Timeline spine */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ring-2 ring-offset-2 ring-offset-card ${
                    isLog
                      ? "bg-primary ring-primary/30"
                      : "bg-slate-600 ring-slate-700"
                  } transition group-hover:ring-primary/50`}
                />
                {!isLast && (
                  <div className="w-px flex-1 bg-slate-800 mt-1 mb-1 min-h-4" />
                )}
              </div>

              {/* Content */}
              <div className="pb-4 flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span
                    className={`text-sm font-medium ${
                      isLog ? "text-primary" : "text-slate-300"
                    }`}
                  >
                    {item.action}
                  </span>
                  <span className="text-xs text-slate-600">
                    {timeAgo(item.created_at)} ·{" "}
                    {new Date(item.created_at).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                {isLog && item.content && (
                  <p className="mt-1 text-sm text-slate-400 leading-relaxed">
                    {parseDailyLog(item.content)}
                  </p>
                )}
                {!isLog && item.details && (
                  <p className="mt-1 text-sm text-slate-400 leading-relaxed">
                    {item.details}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {!compact && items.length > 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/20">
          <PaginationControls
            currentPage={pagination.currentPage}
            pageSize={pagination.pageSize}
            totalItems={pagination.totalItems}
            totalPages={pagination.totalPages}
            startItem={pagination.startItem}
            endItem={pagination.endItem}
            onPageChange={pagination.setCurrentPage}
            onPageSizeChange={pagination.setPageSize}
            itemLabel="events"
          />
        </div>
      ) : null}
    </div>
  );
};

export default ActivityFeed;
