import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getProjects } from "../api/projectsApi";
import {
  getTaskItems,
  createTaskItem,
  updateTaskItem,
  deleteTaskItem,
  getProjectNotes,
  createDailyLog,
  getProjectActivities,
  createProjectActivity,
  type TaskItem,
  type ProjectNote,
  type ProjectActivity,
  type DailyLogPayload,
} from "../api/projectManagerApi";
import useAppStore from "../store/useAppStore";
import type { Project } from "../types";
import { formatDateTime } from "../utils/format";
import InlineSpinner from "../components/InlineSpinner";

// Manager sub-components
import ProjectHeader from "../modules/projects/manager/ProjectHeader";
import ProjectTabs, { type TabId } from "../modules/projects/manager/ProjectTabs";
import WorkLogCard from "../modules/projects/manager/WorkLogCard";
import MilestonesCard from "../modules/projects/manager/MilestonesCard";
import ReportsCard from "../modules/projects/manager/ReportsCard";
import TeamCard, { type TeamMember } from "../modules/projects/manager/TeamCard";
import ActivityFeed from "../modules/projects/manager/ActivityFeed";
import TasksPanel from "../modules/projects/manager/TasksPanel";

// ─── Overview Tab Layout ─────────────────────────────────────────────────────

interface OverviewProps {
  project: Project;
  tasks: TaskItem[];
  milestones: TaskItem[];
  notes: ProjectNote[];
  activities: ProjectActivity[];
  userId: string;
  onLogSubmit: (log: DailyLogPayload) => Promise<void>;
  onMilestoneAdd: (title: string) => Promise<void>;
  onMilestoneToggle: (m: TaskItem) => Promise<void>;
  onMilestoneDelete: (id: string) => Promise<void>;
  onGenerateReport: (type: "today" | "full") => Promise<string>;
  logBusy: boolean;
  lastLogAt: string | null;
}

const OverviewTab = ({
  project,
  tasks,
  milestones,
  notes,
  activities,
  userId,
  onLogSubmit,
  onMilestoneAdd,
  onMilestoneToggle,
  onMilestoneDelete,
  onGenerateReport,
  logBusy,
  lastLogAt,
}: OverviewProps) => {
  const teamMembers: TeamMember[] = [
    { id: userId, email: project.user_id, role: "Owner", avatarColor: "" },
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr,320px] gap-5">
      {/* ── LEFT COLUMN ── */}
      <div className="space-y-5 min-w-0">
        {/* Project Description Card */}
        <div className="glass-panel p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-base">📌</span>
            <h3 className="font-semibold text-slate-200">Project Description</h3>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed">
            {project.description?.trim() || (
              <span className="italic text-slate-500">
                No description added. Edit this project to add one.
              </span>
            )}
          </p>

          {/* Metadata grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-slate-800">
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">
                Start Date
              </p>
              <p className="text-sm text-slate-200 font-medium">
                {formatDateTime(project.created_at ?? "")}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">
                Last Updated
              </p>
              <p className="text-sm text-slate-200 font-medium">
                {formatDateTime(project.updated_at ?? project.created_at ?? "")}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">
                Total Tasks
              </p>
              <p className="text-sm text-slate-200 font-medium">
                {tasks.length} task{tasks.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">
                Velocity
              </p>
              <p className="text-sm text-primary font-semibold">
                {tasks.filter((t) => t.status === "done").length} done
              </p>
            </div>
          </div>
        </div>

        {/* Today's Work Log */}
        <WorkLogCard
          onSubmit={onLogSubmit}
          busy={logBusy}
          lastSubmitted={lastLogAt}
        />

        {/* Recent Activity */}
        <ActivityFeed activities={activities} notes={notes} compact={false} />
      </div>

      {/* ── RIGHT COLUMN ── */}
      <div className="space-y-4">
        <MilestonesCard
          milestones={milestones}
          projectId={project.id}
          userId={userId}
          onAdd={onMilestoneAdd}
          onToggle={onMilestoneToggle}
          onDelete={onMilestoneDelete}
        />

        <ReportsCard project={project} onGenerateReport={onGenerateReport} />

        <TeamCard members={teamMembers} />

        <ActivityFeed
          activities={activities}
          notes={notes}
          compact={true}
        />
      </div>
    </div>
  );
};

// ─── Main Page ───────────────────────────────────────────────────────────────

const ProjectManagerPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    user,
    projects,
    setProjects,
  } = useAppStore();

  // ── Core state ──────────────────────────────────────────────────────────
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [notes, setNotes] = useState<ProjectNote[]>([]);
  const [activities, setActivities] = useState<ProjectActivity[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  // ── UI state ────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logBusy, setLogBusy] = useState(false);
  const [lastLogAt, setLastLogAt] = useState<string | null>(null);

  // ── Derived ─────────────────────────────────────────────────────────────
  const taskItems = tasks.filter((t) => t.item_type === "task");
  const milestones = tasks.filter((t) => t.item_type === "milestone");
  const completedTasks = taskItems.filter((t) => t.status === "done").length;
  const progress =
    taskItems.length > 0
      ? Math.round((completedTasks / taskItems.length) * 100)
      : 0;

  // ── Load everything in parallel ─────────────────────────────────────────
  useEffect(() => {
    if (!id || !user) return;

    const resolveProject = async (): Promise<Project | null> => {
      const fromStore = projects.find((p) => p.id === id);
      if (fromStore) return fromStore;
      const { data } = await getProjects(user.id);
      const list = (data ?? []) as Project[];
      if (list.length) setProjects(list);
      return list.find((p) => p.id === id) ?? null;
    };

    const load = async () => {
      setLoading(true);
      setError(null);

      const [resolved, taskRes, noteRes, actRes] = await Promise.all([
        resolveProject(),
        getTaskItems(id),
        getProjectNotes(id),
        getProjectActivities(id),
      ]);

      if (!resolved) {
        setError("Project not found.");
        setLoading(false);
        return;
      }

      setProject(resolved);
      setTasks(taskRes.data);
      setNotes(noteRes.data);
      setActivities(actRes.data);

      // Set last log time
      const lastLog = noteRes.data.find((n) => n.note_type === "daily_log");
      if (lastLog) setLastLogAt(lastLog.created_at);

      setLoading(false);
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  // Keep project in sync with store
  useEffect(() => {
    if (!id) return;
    const fromStore = projects.find((p) => p.id === id);
    if (fromStore) setProject(fromStore);
  }, [projects, id]);

  // ── Task handlers ────────────────────────────────────────────────────────
  const handleAddTask = useCallback(
    async (title: string) => {
      if (!project || !user) return;
      const { data } = await createTaskItem({
        project_id: project.id,
        user_id: user.id,
        title,
        status: "todo",
        item_type: "task",
      });
      if (data) {
        setTasks((prev) => [...prev, data]);
        await createProjectActivity({
          project_id: project.id,
          user_id: user.id,
          action: `Added task: "${title}"`,
        });
      }
    },
    [project, user]
  );

  const handleToggleTask = useCallback(async (task: TaskItem) => {
    const { data } = await updateTaskItem(task.id, { status: task.status });
    if (data) {
      setTasks((prev) => prev.map((t) => (t.id === data.id ? data : t)));
    }
  }, []);

  const handleDeleteTask = useCallback(
    async (id: string) => {
      await deleteTaskItem(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
    },
    []
  );

  // ── Milestone handlers ────────────────────────────────────────────────────
  const handleAddMilestone = useCallback(
    async (title: string) => {
      if (!project || !user) return;
      const { data } = await createTaskItem({
        project_id: project.id,
        user_id: user.id,
        title,
        status: "todo",
        item_type: "milestone",
      });
      if (data) setTasks((prev) => [...prev, data]);
    },
    [project, user]
  );

  const handleToggleMilestone = useCallback(async (m: TaskItem) => {
    const next: TaskItem["status"] = m.status === "done" ? "todo" : "done";
    const { data } = await updateTaskItem(m.id, { status: next });
    if (data) setTasks((prev) => prev.map((t) => (t.id === data.id ? data : t)));
  }, []);

  const handleDeleteMilestone = useCallback(async (milestoneId: string) => {
    await deleteTaskItem(milestoneId);
    setTasks((prev) => prev.filter((t) => t.id !== milestoneId));
  }, []);

  // ── Work log handler ──────────────────────────────────────────────────────
  const handleLogSubmit = useCallback(
    async (log: DailyLogPayload) => {
      if (!project || !user) return;
      setLogBusy(true);
      const { data } = await createDailyLog({
        project_id: project.id,
        user_id: user.id,
        log,
      });
      if (data) {
        setNotes((prev) => [data, ...prev]);
        setLastLogAt(data.created_at);

        // Add activity entry
        await createProjectActivity({
          project_id: project.id,
          user_id: user.id,
          action: "Posted daily work log",
          details: log.completed || log.next_steps || "",
        });
        setActivities((prev) => [
          {
            id: crypto.randomUUID(),
            project_id: project.id,
            user_id: user.id,
            action: "Posted daily work log",
            details: log.completed || log.next_steps || "",
            created_at: new Date().toISOString(),
          },
          ...prev,
        ]);
      }
      setLogBusy(false);
    },
    [project, user]
  );

  // ── Report generator ──────────────────────────────────────────────────────
  const handleGenerateReport = useCallback(
    async (type: "today" | "full"): Promise<string> => {
      if (!project) return "";

      if (type === "today") {
        const todayLogs = notes.filter((n) => {
          if (n.note_type !== "daily_log") return false;
          const d = new Date(n.created_at);
          const now = new Date();
          return (
            d.getDate() === now.getDate() &&
            d.getMonth() === now.getMonth() &&
            d.getFullYear() === now.getFullYear()
          );
        });

        if (todayLogs.length === 0) {
          return `Daily Report — ${new Date().toDateString()}\nProject: ${project.name}\n\nNo logs posted today yet.`;
        }

        const lines = todayLogs.map((n) => {
          try {
            const parsed = JSON.parse(n.content);
            return [
              `[${new Date(n.created_at).toLocaleTimeString()}]`,
              parsed.completed ? `Completed: ${parsed.completed}` : "",
              parsed.next_steps ? `Next Steps: ${parsed.next_steps}` : "",
              parsed.blockers ? `Blockers: ${parsed.blockers}` : "",
              parsed.notes ? `Notes: ${parsed.notes}` : "",
            ]
              .filter(Boolean)
              .join("\n");
          } catch {
            return n.content;
          }
        });

        return [
          `Daily Report — ${new Date().toDateString()}`,
          `Project: ${project.name}`,
          `Status: ${project.status}`,
          "",
          ...lines,
        ].join("\n");
      }

      // Full report
      const doneTasks = taskItems.filter((t) => t.status === "done");
      const pendingTasks = taskItems.filter((t) => t.status !== "done");
      const doneMilestones = milestones.filter((m) => m.status === "done");

      return [
        `Full Project Report`,
        `Generated: ${new Date().toLocaleString()}`,
        `${"─".repeat(40)}`,
        ``,
        `PROJECT: ${project.name}`,
        `Status: ${project.status}`,
        `Description: ${project.description || "N/A"}`,
        ``,
        `PROGRESS: ${progress}%`,
        `Tasks Completed: ${doneTasks.length}/${taskItems.length}`,
        `Milestones Completed: ${doneMilestones.length}/${milestones.length}`,
        ``,
        `COMPLETED TASKS:`,
        ...doneTasks.map((t) => `  ✓ ${t.title}`),
        ``,
        `PENDING TASKS:`,
        ...pendingTasks.map((t) => `  ○ ${t.title} [${t.status}]`),
        ``,
        `MILESTONES:`,
        ...milestones.map(
          (m) => `  ${m.status === "done" ? "✓" : "○"} ${m.title}`
        ),
        ``,
        `RECENT ACTIVITY:`,
        ...activities
          .slice(0, 5)
          .map(
            (a) =>
              `  • ${a.action} — ${new Date(a.created_at).toLocaleString()}`
          ),
      ].join("\n");
    },
    [project, notes, taskItems, milestones, activities, progress]
  );

  // ── Action stubs ──────────────────────────────────────────────────────────
  const handleExport = () => {
    if (!project) return;
    const content = `Project: ${project.name}\nStatus: ${project.status}\nProgress: ${progress}%\nExported: ${new Date().toLocaleString()}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAddUpdate = () => setActiveTab("overview");

  // ── Tab content renderer ──────────────────────────────────────────────────
  const renderTab = () => {
    if (!project || !user) return null;

    switch (activeTab) {
      case "overview":
        return (
          <OverviewTab
            project={project}
            tasks={taskItems}
            milestones={milestones}
            notes={notes}
            activities={activities}
            userId={user.id}
            onLogSubmit={handleLogSubmit}
            onMilestoneAdd={handleAddMilestone}
            onMilestoneToggle={handleToggleMilestone}
            onMilestoneDelete={handleDeleteMilestone}
            onGenerateReport={handleGenerateReport}
            logBusy={logBusy}
            lastLogAt={lastLogAt}
          />
        );

      case "milestones":
        return (
          <div className="max-w-2xl">
            <MilestonesCard
              milestones={milestones}
              projectId={project.id}
              userId={user.id}
              onAdd={handleAddMilestone}
              onToggle={handleToggleMilestone}
              onDelete={handleDeleteMilestone}
            />
          </div>
        );

      case "tasks":
        return (
          <TasksPanel
            tasks={taskItems}
            projectId={project.id}
            userId={user.id}
            onAdd={handleAddTask}
            onToggle={handleToggleTask}
            onDelete={handleDeleteTask}
          />
        );

      case "activity":
        return (
          <div className="max-w-3xl">
            <ActivityFeed activities={activities} notes={notes} compact={false} />
          </div>
        );

      case "reports":
        return (
          <div className="max-w-lg">
            <ReportsCard
              project={project}
              onGenerateReport={handleGenerateReport}
            />
          </div>
        );

      case "team":
        return (
          <div className="max-w-md">
            <TeamCard
              members={[
                {
                  id: user.id,
                  email: user.email ?? "owner@workspace",
                  role: "Owner",
                  avatarColor: "",
                },
              ]}
            />
          </div>
        );

      default:
        return null;
    }
  };

  // ── Loading / Error states ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <InlineSpinner />
          <p className="text-sm">Loading project...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="glass-panel p-8 max-w-md text-center space-y-3">
          <p className="text-4xl">🔍</p>
          <p className="text-lg font-semibold text-slate-200">
            Project not found
          </p>
          <p className="text-sm text-slate-400">
            {error ??
              "This project doesn't exist or you don't have access."}
          </p>
          <button
            className="btn-primary"
            onClick={() => navigate("/projects")}
          >
            ← Back to Projects
          </button>
        </div>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <ProjectHeader
        project={project}
        progress={progress}
        onExport={handleExport}
        onGenerateReport={() => setActiveTab("reports")}
        onAddUpdate={handleAddUpdate}
      />

      {/* Tabs */}
      <div className="glass-panel overflow-hidden">
        <ProjectTabs
          activeTab={activeTab}
          onChange={setActiveTab}
          taskCount={taskItems.length}
        />
      </div>

      {/* Tab content */}
      <div className="pb-8">{renderTab()}</div>
    </div>
  );
};

export default ProjectManagerPage;
