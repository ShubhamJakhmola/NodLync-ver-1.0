import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getProjects } from "../api/projectsApi";
import {
  createDailyLog,
  createProjectActivity,
  createTaskItem,
  deleteTaskItem,
  getProjectActivities,
  getProjectNotes,
  getTaskItems,
  updateTaskItem,
  type DailyLogPayload,
  type ProjectActivity,
  type ProjectNote,
  type TaskItem,
} from "../api/projectManagerApi";
import InlineSpinner from "../components/InlineSpinner";
import ActivityFeed from "../modules/projects/manager/ActivityFeed";
import MilestonesCard from "../modules/projects/manager/MilestonesCard";
import ProjectHeader from "../modules/projects/manager/ProjectHeader";
import ProjectTabs, { type TabId } from "../modules/projects/manager/ProjectTabs";
import ReportsCard from "../modules/projects/manager/ReportsCard";
import TasksPanel from "../modules/projects/manager/TasksPanel";
import TeamCard, { type TeamMember } from "../modules/projects/manager/TeamCard";
import WorkLogCard from "../modules/projects/manager/WorkLogCard";
import useAppStore from "../store/useAppStore";
import type { Project } from "../types";
import { formatDateTime } from "../utils/format";

interface OverviewProps {
  project: Project;
  tasks: TaskItem[];
  milestones: TaskItem[];
  notes: ProjectNote[];
  activities: ProjectActivity[];
  userId: string;
  onLogSubmit: (log: DailyLogPayload) => Promise<void>;
  onMilestoneAdd: (title: string) => Promise<void>;
  onMilestoneToggle: (milestone: TaskItem) => Promise<void>;
  onMilestoneDelete: (id: string) => Promise<void>;
  onMilestoneBulkDelete: (ids: string[]) => Promise<void>;
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
  onMilestoneBulkDelete,
  onGenerateReport,
  logBusy,
  lastLogAt,
}: OverviewProps) => {
  const teamMembers: TeamMember[] = [
    { id: userId, email: project.user_id, role: "Owner", avatarColor: "" },
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr,320px] gap-5">
      <div className="space-y-5 min-w-0">
        <div className="glass-panel p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-base">Pin</span>
            <h3 className="font-semibold text-slate-200">Project Description</h3>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed">
            {project.description?.trim() || (
              <span className="italic text-slate-500">No description added. Edit this project to add one.</span>
            )}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-slate-800">
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Start Date</p>
              <p className="text-sm text-slate-200 font-medium">{formatDateTime(project.created_at ?? "")}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Last Updated</p>
              <p className="text-sm text-slate-200 font-medium">{formatDateTime(project.updated_at ?? project.created_at ?? "")}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Total Tasks</p>
              <p className="text-sm text-slate-200 font-medium">{tasks.length} task{tasks.length !== 1 ? "s" : ""}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Velocity</p>
              <p className="text-sm text-primary font-semibold">{tasks.filter((task) => task.status === "done").length} done</p>
            </div>
          </div>
        </div>

        <WorkLogCard onSubmit={onLogSubmit} busy={logBusy} lastSubmitted={lastLogAt} />
        <ActivityFeed activities={activities} notes={notes} compact={false} />
      </div>

      <div className="space-y-4">
        <MilestonesCard
          milestones={milestones}
          projectId={project.id}
          userId={userId}
          onAdd={onMilestoneAdd}
          onToggle={onMilestoneToggle}
          onDelete={onMilestoneDelete}
          onBulkDelete={onMilestoneBulkDelete}
        />
        <ReportsCard project={project} onGenerateReport={onGenerateReport} />
        <TeamCard members={teamMembers} />
        <ActivityFeed activities={activities} notes={notes} compact={true} />
      </div>
    </div>
  );
};

const ProjectManagerPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, projects, setProjects } = useAppStore();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [notes, setNotes] = useState<ProjectNote[]>([]);
  const [activities, setActivities] = useState<ProjectActivity[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logBusy, setLogBusy] = useState(false);
  const [lastLogAt, setLastLogAt] = useState<string | null>(null);

  const taskItems = tasks.filter((task) => task.item_type === "task");
  const milestones = tasks.filter((task) => task.item_type === "milestone");
  const completedTasks = taskItems.filter((task) => task.status === "done").length;
  const progress = taskItems.length > 0 ? Math.round((completedTasks / taskItems.length) * 100) : 0;

  useEffect(() => {
    if (!id || !user) return;

    const resolveProject = async (): Promise<Project | null> => {
      const fromStore = projects.find((entry) => entry.id === id);
      if (fromStore) return fromStore;
      const { data } = await getProjects(user.id);
      const list = (data ?? []) as Project[];
      if (list.length) setProjects(list);
      return list.find((entry) => entry.id === id) ?? null;
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

      const lastLog = noteRes.data.find((note) => note.note_type === "daily_log");
      if (lastLog) setLastLogAt(lastLog.created_at);

      setLoading(false);
    };

    load();
  }, [id, user, projects, setProjects]);

  useEffect(() => {
    if (!id) return;
    const fromStore = projects.find((entry) => entry.id === id);
    if (fromStore) setProject(fromStore);
  }, [projects, id]);

  const handleAddTask = useCallback(async (title: string) => {
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
  }, [project, user]);

  const handleToggleTask = useCallback(async (task: TaskItem) => {
    const { data } = await updateTaskItem(task.id, { status: task.status });
    if (data) setTasks((prev) => prev.map((entry) => (entry.id === data.id ? data : entry)));
  }, []);

  const handleDeleteTask = useCallback(async (taskId: string) => {
    await deleteTaskItem(taskId);
    setTasks((prev) => prev.filter((entry) => entry.id !== taskId));
  }, []);

  const handleBulkDeleteTasks = useCallback(async (ids: string[]) => {
    await Promise.all(ids.map((taskId) => deleteTaskItem(taskId)));
    setTasks((prev) => prev.filter((entry) => !ids.includes(entry.id)));
  }, []);

  const handleAddMilestone = useCallback(async (title: string) => {
    if (!project || !user) return;
    const { data } = await createTaskItem({
      project_id: project.id,
      user_id: user.id,
      title,
      status: "todo",
      item_type: "milestone",
    });
    if (data) setTasks((prev) => [...prev, data]);
  }, [project, user]);

  const handleToggleMilestone = useCallback(async (milestone: TaskItem) => {
    const next = milestone.status === "done" ? "todo" : "done";
    const { data } = await updateTaskItem(milestone.id, { status: next });
    if (data) setTasks((prev) => prev.map((entry) => (entry.id === data.id ? data : entry)));
  }, []);

  const handleDeleteMilestone = useCallback(async (milestoneId: string) => {
    await deleteTaskItem(milestoneId);
    setTasks((prev) => prev.filter((entry) => entry.id !== milestoneId));
  }, []);

  const handleBulkDeleteMilestones = useCallback(async (ids: string[]) => {
    await Promise.all(ids.map((milestoneId) => deleteTaskItem(milestoneId)));
    setTasks((prev) => prev.filter((entry) => !ids.includes(entry.id)));
  }, []);

  const handleLogSubmit = useCallback(async (log: DailyLogPayload) => {
    if (!project || !user) return;
    setLogBusy(true);
    const { data } = await createDailyLog({ project_id: project.id, user_id: user.id, log });
    if (data) {
      setNotes((prev) => [data, ...prev]);
      setLastLogAt(data.created_at);
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
  }, [project, user]);

  const handleGenerateReport = useCallback(async (type: "today" | "full") => {
    if (!project) return "";

    if (type === "today") {
      const todayLogs = notes.filter((note) => {
        if (note.note_type !== "daily_log") return false;
        const date = new Date(note.created_at);
        const now = new Date();
        return date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      });

      if (todayLogs.length === 0) {
        return `Daily Report - ${new Date().toDateString()}\nProject: ${project.name}\n\nNo logs posted today yet.`;
      }

      const lines = todayLogs.map((note) => {
        try {
          const parsed = JSON.parse(note.content);
          return [
            `[${new Date(note.created_at).toLocaleTimeString()}]`,
            parsed.completed ? `Completed: ${parsed.completed}` : "",
            parsed.next_steps ? `Next Steps: ${parsed.next_steps}` : "",
            parsed.blockers ? `Blockers: ${parsed.blockers}` : "",
            parsed.notes ? `Notes: ${parsed.notes}` : "",
          ].filter(Boolean).join("\n");
        } catch {
          return note.content;
        }
      });

      return [`Daily Report - ${new Date().toDateString()}`, `Project: ${project.name}`, `Status: ${project.status}`, "", ...lines].join("\n");
    }

    const doneTasks = taskItems.filter((task) => task.status === "done");
    const pendingTasks = taskItems.filter((task) => task.status !== "done");
    const doneMilestones = milestones.filter((milestone) => milestone.status === "done");

    return [
      "Full Project Report",
      `Generated: ${new Date().toLocaleString()}`,
      `${"-".repeat(40)}`,
      "",
      `PROJECT: ${project.name}`,
      `Status: ${project.status}`,
      `Description: ${project.description || "N/A"}`,
      "",
      `PROGRESS: ${progress}%`,
      `Tasks Completed: ${doneTasks.length}/${taskItems.length}`,
      `Milestones Completed: ${doneMilestones.length}/${milestones.length}`,
      "",
      "COMPLETED TASKS:",
      ...doneTasks.map((task) => `  * ${task.title}`),
      "",
      "PENDING TASKS:",
      ...pendingTasks.map((task) => `  - ${task.title} [${task.status}]`),
      "",
      "MILESTONES:",
      ...milestones.map((milestone) => `  ${milestone.status === "done" ? "*" : "-"} ${milestone.title}`),
      "",
      "RECENT ACTIVITY:",
      ...activities.slice(0, 5).map((activity) => `  • ${activity.action} - ${new Date(activity.created_at).toLocaleString()}`),
    ].join("\n");
  }, [project, notes, taskItems, milestones, activities, progress]);

  const handleExport = () => {
    if (!project) return;
    const content = `Project: ${project.name}\nStatus: ${project.status}\nProgress: ${progress}%\nExported: ${new Date().toLocaleString()}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${project.name.replace(/\s+/g, "_")}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

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
            onMilestoneBulkDelete={handleBulkDeleteMilestones}
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
              onBulkDelete={handleBulkDeleteMilestones}
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
            onBulkDelete={handleBulkDeleteTasks}
          />
        );
      case "activity":
        return <div className="max-w-3xl"><ActivityFeed activities={activities} notes={notes} compact={false} /></div>;
      case "reports":
        return <div className="max-w-lg"><ReportsCard project={project} onGenerateReport={handleGenerateReport} /></div>;
      case "team":
        return (
          <div className="max-w-md">
            <TeamCard members={[{ id: user.id, email: user.email ?? "owner@workspace", role: "Owner", avatarColor: "" }]} />
          </div>
        );
      default:
        return null;
    }
  };

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
          <p className="text-4xl">Search</p>
          <p className="text-lg font-semibold text-slate-200">Project not found</p>
          <p className="text-sm text-slate-400">{error ?? "This project doesn't exist or you don't have access."}</p>
          <button className="btn-primary" onClick={() => navigate("/projects")}>Back to Projects</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <ProjectHeader
        project={project}
        progress={progress}
        onExport={handleExport}
        onGenerateReport={() => setActiveTab("reports")}
        onAddUpdate={() => setActiveTab("overview")}
      />

      <div className="glass-panel overflow-hidden">
        <ProjectTabs activeTab={activeTab} onChange={setActiveTab} taskCount={taskItems.length} />
      </div>

      <div className="pb-8">{renderTab()}</div>
    </div>
  );
};

export default ProjectManagerPage;

