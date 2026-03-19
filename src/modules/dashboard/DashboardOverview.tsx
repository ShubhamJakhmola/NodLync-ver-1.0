import { useEffect, useMemo, useState } from "react";
import useAppStore from "../../store/useAppStore";
import { getMeetings } from "../../api/meetingsApi";
import { getTaskItems, type TaskItem } from "../../api/projectManagerApi";
import { listFolders, listWorkflows, type WorkflowsRow } from "../../api/workflowsApi";
import type { ActiveProjectRow } from "./DashboardActiveProjectsOverview";
import DashboardActiveProjectsOverview from "./DashboardActiveProjectsOverview";
import DashboardCalendarCard from "./DashboardCalendarCard";
import DashboardAiInsightsCard from "./DashboardAiInsightsCard";
import DashboardMainTerminalCard from "./DashboardMainTerminalCard";
import DashboardQuickActionsCard from "./DashboardQuickActionsCard";
import DashboardStatCard from "./DashboardStatCard";
import DashboardUpcomingTasksCard from "./DashboardUpcomingTasksCard";
import DashboardWorkflowsCard from "./DashboardWorkflowsCard";

function isValidDate(d: string) {
  return !Number.isNaN(new Date(d).getTime());
}

function startOfToday() {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

export default function DashboardOverview() {
  const projects = useAppStore((s) => s.projects);
  const user = useAppStore((s) => s.user);

  const [loadingStats, setLoadingStats] = useState(false);
  const [activeProjectRows, setActiveProjectRows] = useState<ActiveProjectRow[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<
    Array<{ task: TaskItem; projectName: string }>
  >([]);
  const [meetingsTodayCount, setMeetingsTodayCount] = useState(0);
  const [completionRate, setCompletionRate] = useState(0);
  const [workflows, setWorkflows] = useState<WorkflowsRow[]>([]);

  const now = useMemo(() => new Date(), [projects.length]);

  const calendarYear = now.getFullYear();
  const calendarMonthIndex = now.getMonth();

  const highlightedDays = useMemo(() => {
    const s = new Set<number>();
    upcomingTasks.forEach(({ task }) => {
      if (!task.deadline) return;
      if (!isValidDate(task.deadline)) return;
      const dt = new Date(task.deadline);
      if (dt.getFullYear() === calendarYear && dt.getMonth() === calendarMonthIndex) {
        s.add(dt.getDate());
      }
    });
    return s;
  }, [upcomingTasks, calendarYear, calendarMonthIndex]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoadingStats(true);
      try {
        const activeProjects = projects.filter((p) => p.status === "active");
        const selectedProjects = activeProjects.slice(0, 4);

        // 1) Fetch task summaries per active project
        const projectTasks = await Promise.all(
          selectedProjects.map(async (p) => {
            try {
              const { data } = await getTaskItems(p.id);
              const tasks = data ?? [];
              const total = tasks.length;
              const done = tasks.filter((t) => t.status === "done").length;
              const activeTasks = tasks.filter((t) => t.status !== "done").length;
              const progress = total === 0 ? 0 : Math.round((done / total) * 100);

              const today = startOfToday();
              const delayed = tasks.some((t) => {
                if (!t.deadline || t.status === "done") return false;
                if (!isValidDate(t.deadline)) return false;
                return new Date(t.deadline).getTime() < today.getTime();
              });

              const stateLabel = delayed ? "DELAYED" : "ACTIVE";

              return {
                project: p,
                tasks,
                total,
                done,
                activeTasks,
                progress,
                stateLabel: stateLabel as "ACTIVE" | "DELAYED",
              };
            } catch {
              return {
                project: p,
                tasks: [] as TaskItem[],
                total: 0,
                done: 0,
                activeTasks: 0,
                progress: 0,
                stateLabel: "ACTIVE" as "ACTIVE" | "DELAYED",
              };
            }
          })
        );

        const completion = (() => {
          const total = projectTasks.reduce((acc, r) => acc + r.total, 0);
          const done = projectTasks.reduce((acc, r) => acc + r.done, 0);
          if (total === 0) return 0;
          return Math.round((done / total) * 1000) / 10; // keep one decimal like 92.4%
        })();

        const rows: ActiveProjectRow[] = projectTasks.map((r) => ({
          project: r.project,
          progress: r.progress,
          stateLabel: r.stateLabel,
          doneCount: r.done,
          totalCount: r.total,
          description: r.project.description,
        }));

        const today = startOfToday();
        const weekEnd = new Date(today);
        weekEnd.setDate(weekEnd.getDate() + 7);

        const allTasks = projectTasks.flatMap((r) =>
          r.tasks.map((t) => ({
            task: t,
            projectName: r.project.name,
          }))
        );

        const upcoming = allTasks
          .filter(({ task }) => task.deadline && isValidDate(task.deadline) && task.status !== "done")
          .filter(({ task }) => {
            const due = new Date(task.deadline as string);
            const dueMs = due.getTime();
            return dueMs >= today.getTime() && dueMs <= weekEnd.getTime();
          })
          .sort((a, b) => new Date(a.task.deadline as string).getTime() - new Date(b.task.deadline as string).getTime());

        // 2) Meetings today
        const meetingCount = 0;

        if (!cancelled) {
          setActiveProjectRows(rows);
          setUpcomingTasks(upcoming);
          setCompletionRate(completion);
        }

        if (user) {
          const { data: meetings } = await getMeetings(user.id);
          const todayKey = today.toISOString().split("T")[0];
          const count = (meetings ?? []).filter((m) => m.scheduled_at?.startsWith(todayKey)).length;
          if (!cancelled) setMeetingsTodayCount(count);
        } else if (!cancelled) setMeetingsTodayCount(meetingCount);

        // 3) Workflows
        const { data: folders } = await listFolders();
        const folder = (folders ?? [])[0];
        if (folder?.id) {
          const { data: wfData } = await listWorkflows(folder.id);
          if (!cancelled) setWorkflows(wfData ?? []);
        } else if (!cancelled) {
          setWorkflows([]);
        }
      } finally {
        if (!cancelled) setLoadingStats(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [projects, user]);

  const totalProjects = projects.length;
  const activeTaskCount = useMemo(() => {
    // Keep it derived from rows + completion numbers. If we don't have task fetch, show 0.
    return activeProjectRows.reduce((acc, r) => acc + (r.totalCount - r.doneCount), 0);
  }, [activeProjectRows]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <DashboardStatCard
          icon={<span className="text-lg">📁</span>}
          label="Total Projects"
          value={totalProjects}
          tone="primary"
          meta={"-12%"}
        />
        <DashboardStatCard
          icon={<span className="text-lg">✅</span>}
          label="Active Tasks"
          value={activeTaskCount}
          tone="emerald"
        />
        <DashboardStatCard
          icon={<span className="text-lg">📅</span>}
          label="Meetings Today"
          value={String(meetingsTodayCount).padStart(2, "0")}
          tone="amber"
        />
        <DashboardStatCard
          icon={<span className="text-lg">📈</span>}
          label="Completion Rate"
          value={`${completionRate.toFixed(1)}%`}
          tone="primary"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="space-y-6 xl:col-span-5">
          <DashboardActiveProjectsOverview
            rows={activeProjectRows}
            onViewAll={() => {
              // Placeholder behavior; route exists but this overview is summary-only.
            }}
          />
          <DashboardUpcomingTasksCard tasks={upcomingTasks} />
        </div>

        <div className="space-y-6 xl:col-span-4">
          <DashboardWorkflowsCard workflows={workflows} />
          <DashboardCalendarCard highlightedDays={highlightedDays} year={calendarYear} monthIndex={calendarMonthIndex} />
        </div>

        <div className="space-y-6 xl:col-span-3">
          <DashboardAiInsightsCard />
          <DashboardQuickActionsCard />
          <DashboardMainTerminalCard />
        </div>
      </div>

      {loadingStats ? (
        <div className="text-xs text-slate-500 text-center">Refreshing dashboard...</div>
      ) : null}
    </div>
  );
}
