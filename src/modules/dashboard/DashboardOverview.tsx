import { useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDashboard } from "../../hooks/useDashboard";
import { logAppEvent } from "../../utils/appLogger";
import useAppStore from "../../store/useAppStore";
import DashboardActiveProjectsOverview from "./DashboardActiveProjectsOverview";
import DashboardAiInsightsCard from "./DashboardAiInsightsCard";
import DashboardCalendarCard from "./DashboardCalendarCard";
import DashboardIdeaCard from "./DashboardIdeaCard";
import DashboardQuickActionsCard from "./DashboardQuickActionsCard";
import DashboardResearchCard from "./DashboardResearchCard";
import DashboardSkeleton from "./DashboardSkeleton";
import MetricCard from "./MetricCard";
import DashboardUpcomingTasksCard from "./DashboardUpcomingTasksCard";
import DashboardWorkflowsCard from "./DashboardWorkflowsCard";

export default function DashboardOverview() {
  const navigate = useNavigate();
  const user = useAppStore((s) => s.user);
  const {
    totalProjectsCount,
    activeTaskCount,
    meetingsTodayCount,
    completionRate,
    activeProjectRows,
    upcomingTasks,
    workflows,
    loading,
    initialLoad,
    error,
  } = useDashboard();

  // Log dashboard view
  useEffect(() => {
    if (user) {
      void logAppEvent({
        type: "info",
        module: "dashboard",
        message: `Viewed dashboard with ${totalProjectsCount} projects, ${activeTaskCount} tasks`,
        meta: { totalProjectsCount, activeTaskCount, meetingsTodayCount, completionRate },
      });
    }
  }, [user, totalProjectsCount, activeTaskCount, meetingsTodayCount, completionRate]);

  const now = useMemo(() => new Date(), []);
  const calendarYear = now.getFullYear();
  const calendarMonthIndex = now.getMonth();

  const highlightedDays = useMemo(() => {
    const set = new Set<number>();
    upcomingTasks.forEach(({ task }) => {
      if (!task.deadline) return;
      const dt = new Date(task.deadline);
      if (dt.getFullYear() === calendarYear && dt.getMonth() === calendarMonthIndex) {
        set.add(dt.getDate());
      }
    });
    return set;
  }, [upcomingTasks, calendarYear, calendarMonthIndex]);

  if (initialLoad) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      {error ? (
        <div className="glass-panel rounded-2xl border border-rose-800/40 bg-rose-950/30 px-5 py-4 text-sm text-rose-200 overflow-anywhere">
          {error}
        </div>
      ) : null}

      {totalProjectsCount === 0 ? (
        <div className="glass-panel p-6 text-center space-y-4 sm:p-10">
          <p className="text-lg font-bold text-fg-secondary text-wrap-balance">No projects yet</p>
          <p className="mx-auto max-w-xl text-sm text-fg-muted text-wrap-balance">
            Create a project to unlock tasks, logs, workflows, and dashboards.
          </p>
          <button className="btn-primary px-5 py-2.5 text-sm" onClick={() => navigate("/app/projects")}>
            Go to Projects
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon="📁"
          title="Total Projects"
          value={totalProjectsCount}
          color="primary"
          onClick={() => navigate("/app/projects")}
        />
        <MetricCard
          icon="✅"
          title="Active Tasks"
          value={activeTaskCount}
          color="emerald"
          onClick={() => navigate("/app/projects")}
        />
        <MetricCard
          icon="🗓️"
          title="Meetings Today"
          value={String(meetingsTodayCount).padStart(2, "0")}
          color="amber"
          onClick={() => navigate("/app/meetings")}
        />
        <MetricCard
          icon="📈"
          title="Completion Rate"
          value={`${completionRate.toFixed(1)}%`}
          color="primary"
          onClick={() => navigate("/app/projects")}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-5">
          <DashboardActiveProjectsOverview rows={activeProjectRows} onViewAll={() => navigate("/app/projects")} />
          <DashboardUpcomingTasksCard tasks={upcomingTasks} />
        </div>

        <div className="space-y-6 xl:col-span-4">
          <DashboardWorkflowsCard workflows={workflows} />
          <DashboardCalendarCard highlightedDays={highlightedDays} year={calendarYear} monthIndex={calendarMonthIndex} />
        </div>

        <div className="space-y-6 xl:col-span-3 lg:col-span-2">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-1">
            <DashboardAiInsightsCard />
            <DashboardIdeaCard />
            <DashboardResearchCard />
            <DashboardQuickActionsCard />
          </div>
        </div>
      </div>

      {loading && !initialLoad ? (
        <div className="fixed right-4 top-4 z-50 animate-pulse rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-on-primary shadow-lg">
          Refreshing Data...
        </div>
      ) : null}
    </div>
  );
}
