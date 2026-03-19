import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getProjects } from "../api/projectsApi";
import { supabase } from "../api/supabaseClient";
import {
  getMilestones,
  getTaskItems,
  getProjectLogs,
  getAllProjectLogs,
  getProjectLogsPage,
  getProjectMembers,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  createTaskItem,
  updateTaskItem,
  deleteTaskItem,
  createProjectLog,
  createProjectReport,
  type Milestone,
  type TaskItem,
  type ProjectLog,
  type ProjectMember,
} from "../api/projectManagerApi";
import InlineSpinner from "../components/InlineSpinner";
import ProjectHeader from "../modules/projects/manager/ProjectHeader";
import ProjectTabs, { type TabId } from "../modules/projects/manager/ProjectTabs";
import MilestonesCard from "../modules/projects/manager/MilestonesCard";
import TasksPanel from "../modules/projects/manager/TasksPanel";
import TeamCard from "../modules/projects/manager/TeamCard";
import WorkLogCard from "../modules/projects/manager/WorkLogCard";
import ReportsCard from "../modules/projects/manager/ReportsCard";
import useAppStore from "../store/useAppStore";
import type { Project } from "../types";
import { formatDateTime } from "../utils/format";

const HistoryList = ({
  project,
  logs,
  page,
  pageSize,
  total,
  onPageChange,
  onDeleteSelected,
  onExportSelected,
}: {
  project: Project;
  logs: ProjectLog[];
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => Promise<void>;
  onDeleteSelected: (ids: string[]) => Promise<void>;
  onExportSelected: (ids: string[]) => void;
}) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const togglePage = () => {
    const ids = logs.map((l) => l.id);
    const allSelected = ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  };

  const clear = () => setSelected(new Set());

  const selectedIds = Array.from(selected);
  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(total, page * pageSize);

  return (
    <div className="space-y-4">
      {selectedIds.length > 0 && (
        <div className="glass-panel p-3 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            {selectedIds.length} selected
          </div>
          <div className="flex items-center gap-2">
            <button
              className="btn-ghost text-xs"
              onClick={() => onExportSelected(selectedIds)}
            >
              Export Selected
            </button>
            <button
              className="btn-ghost text-xs text-rose-400 hover:text-rose-300"
              onClick={async () => {
                if (!window.confirm(`Delete ${selectedIds.length} selected log(s)?`)) return;
                await onDeleteSelected(selectedIds);
                clear();
              }}
            >
              Delete Selected
            </button>
            <button className="btn-ghost text-xs" onClick={clear}>
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="glass-panel divide-y divide-slate-800">
        <div className="flex items-center gap-3 px-4 py-3 text-xs uppercase tracking-[0.18em] text-slate-500">
          <input
            type="checkbox"
            checked={logs.length > 0 && logs.every((l) => selected.has(l.id))}
            onChange={togglePage}
            className="h-4 w-4 accent-primary"
            aria-label="Select all visible logs"
          />
          <span>Visible logs</span>
        </div>
        {logs.map((log) => (
          <div key={log.id} className="px-4 py-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selected.has(log.id)}
                  onChange={() => toggleOne(log.id)}
                  className="h-4 w-4 accent-primary"
                  aria-label={`Select log ${log.created_at}`}
                />
                <span className="text-xs text-slate-500 font-mono">
                  {formatDateTime(log.created_at)}
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] text-emerald-400 uppercase font-bold mb-1">Completed</div>
                <div className="text-sm text-slate-300 whitespace-pre-wrap">{log.completed_work || ""}</div>
              </div>
              <div>
                <div className="text-[10px] text-amber-400 uppercase font-bold mb-1">Next Steps</div>
                <div className="text-sm text-slate-300 whitespace-pre-wrap">{log.next_steps || ""}</div>
              </div>
              <div>
                <div className="text-[10px] text-rose-400 uppercase font-bold mb-1">Blockers</div>
                <div className="text-sm text-slate-300 whitespace-pre-wrap">{log.blockers || ""}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Notes</div>
                <div className="text-sm text-slate-300 whitespace-pre-wrap">{log.notes || ""}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="glass-panel p-4 flex items-center justify-between">
        <div className="text-xs text-slate-500">
          Showing {startItem}-{endItem} of {total} for {project.name}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn-ghost text-xs"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Prev
          </button>
          <span className="text-xs text-slate-500 font-mono">
            {page}/{totalPages}
          </span>
          <button
            className="btn-ghost text-xs"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

function downloadTxt(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const OverviewTab = ({
  project,
  milestones,
  logs,
  onLogSubmit,
  userId,
  onAddMilestone,
  onUpdateMilestone,
  onDeleteMilestone,
}: {
  project: Project;
  milestones: Milestone[];
  logs: ProjectLog[];
  onLogSubmit: (payload: any) => Promise<void>;
  userId: string;
  onAddMilestone: (payload: { title: string; deadline?: string | null }) => Promise<void>;
  onUpdateMilestone: (m: any) => Promise<void>;
  onDeleteMilestone: (id: string) => Promise<void>;
}) => {
  const lastCompletedMilestone = [...milestones].reverse().find(m => m.status === 'completed');
  const inProgressMilestone = milestones.find(m => m.status === 'in_progress');

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr,350px] gap-6">
      <div className="space-y-6">
        {/* Recent Milestones */}
        <div className="glass-panel p-6">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Milestone Pulse</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/50">
              <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Last Completed</p>
              <p className="text-slate-200 font-medium">{lastCompletedMilestone?.title || "No milestones completed yet"}</p>
            </div>
            <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
              <p className="text-[10px] text-primary/70 uppercase font-bold mb-1 font-mono">Current Phase</p>
              <p className="text-primary font-semibold">{inProgressMilestone?.title || "No milestone in progress"}</p>
            </div>
          </div>
        </div>

        {/* Daily Log Input */}
        <WorkLogCard onSubmit={onLogSubmit} />

        {/* Recent Work Logs (Last 5 days approx) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Recent Activity Logs</h3>
            <span className="text-[10px] text-slate-500 font-mono">Last {logs.length} entries</span>
          </div>
          {logs.length === 0 ? (
            <div className="glass-panel p-8 text-center text-slate-500 text-sm">No work logs recorded yet.</div>
          ) : (
            logs.map(log => (
              <div key={log.id} className="glass-panel p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-primary">Team Member</span>
                  <span className="text-[10px] text-slate-500 font-mono">{formatDateTime(log.created_at)}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h4 className="text-[10px] text-emerald-400 uppercase font-bold mb-1">Completed</h4>
                    <p className="text-sm text-slate-300 leading-relaxed">{log.completed_work}</p>
                  </div>
                  <div>
                    <h4 className="text-[10px] text-amber-400 uppercase font-bold mb-1">Next Steps</h4>
                    <p className="text-sm text-slate-300 leading-relaxed">{log.next_steps}</p>
                  </div>
                  <div>
                    <h4 className="text-[10px] text-rose-400 uppercase font-bold mb-1">Blockers</h4>
                    <p className="text-sm text-slate-300 leading-relaxed">{log.blockers || <span className="italic opacity-30">None</span>}</p>
                  </div>
                </div>
                {log.notes && (
                  <div className="pt-2 border-t border-slate-800/50">
                    <p className="text-xs text-slate-500 italic">{log.notes}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="space-y-6">
        <MilestonesCard
         milestones={milestones.map(m => ({ ...m, item_type: 'milestone' } as any))}
         projectId={project.id}
         userId={userId}
         onAdd={onAddMilestone}
         onToggle={(m: any) => onUpdateMilestone({ ...m, status: m.status === 'completed' ? 'in_progress' : 'completed' })}
         onDelete={onDeleteMilestone}
         onBulkDelete={async (ids) => { for(const mid of ids) await onDeleteMilestone(mid); }}
        />
        <TeamCard members={[]} />
      </div>
    </div>
  );
};

const ProjectManagerPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAppStore();

  const [project, setProject] = useState<Project | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [logs, setLogs] = useState<ProjectLog[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [loading, setLoading] = useState(true);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize] = useState(10);
  const [historyLogs, setHistoryLogs] = useState<ProjectLog[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadAll = useCallback(async () => {
    if (!id || !user) return;
    setLoading(true);
    try {
      const [pRes, mRes, tRes, lRes, memRes] = await Promise.all([
        getProjects(user.id),
        getMilestones(id),
        getTaskItems(id),
        getProjectLogs(id),
        getProjectMembers(id),
      ]);

      const foundProject = (pRes.data as Project[]).find(p => p.id === id);
      if (foundProject) setProject(foundProject);
      setMilestones(mRes.data || []);
      setTasks(tRes.data || []);
      setLogs(lRes.data || []);
      setMembers(memRes.data || []);
    } catch (err) {
      console.error("Load failed", err);
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const loadHistory = useCallback(async (page: number) => {
    if (!id) return;
    setHistoryLoading(true);
    try {
      const res = await getProjectLogsPage(id, page, historyPageSize);
      // eslint-disable-next-line no-console
      console.log("RESPONSE - project_logs (history page)", res);
      if (res.error) {
        // eslint-disable-next-line no-console
        console.error("ERROR - project_logs (history page)", res.error);
        throw res.error;
      }
      setHistoryLogs(res.data || []);
      setHistoryTotal(res.count || 0);
    } finally {
      setHistoryLoading(false);
    }
  }, [historyPageSize, id]);

  useEffect(() => {
    if (activeTab === "history") {
      setHistoryPage(1);
      loadHistory(1);
    }
  }, [activeTab, loadHistory]);

  const handleLogSubmit = async (payload: any) => {
    if (!project || !user) return;
    const insertPayload = {
      project_id: project.id,
      user_id: user.id,
      completed_work: payload.completed,
      next_steps: payload.next_steps,
      blockers: payload.blockers,
      notes: payload.notes,
    };

    // Debug logging for diagnostics
    // eslint-disable-next-line no-console
    console.log("INSERT PAYLOAD - project_logs", insertPayload);

    const response = await createProjectLog(insertPayload);

    // eslint-disable-next-line no-console
    console.log("RESPONSE - project_logs", response);

    if ((response as any).error) {
      // eslint-disable-next-line no-console
      console.error("ERROR - project_logs", (response as any).error);
      throw (response as any).error;
    }

    const updatedLogs = await getProjectLogs(project.id);

    // eslint-disable-next-line no-console
    console.log("RESPONSE - project_logs (refetch)", updatedLogs);

    if (updatedLogs.error) {
      // eslint-disable-next-line no-console
      console.error("ERROR - project_logs (refetch)", updatedLogs.error);
      throw updatedLogs.error;
    }

    setLogs(updatedLogs.data || []);

    if (activeTab === "history") {
      await loadHistory(historyPage);
    }
  };

  const handleAddMilestone = async (payload: { title: string; deadline?: string | null }) => {
    if (!project || !user) return;
    const { data } = await createMilestone({
      project_id: project.id,
      user_id: user.id,
      title: payload.title,
      deadline: payload.deadline ? payload.deadline : null,
      status: 'not_started'
    });
    if (data) setMilestones(prev => [...prev, data]);
  };

  const handleUpdateMilestone = async (m: any) => {
    const updatePayload: Partial<Milestone> = {
      title: m.title,
      status: m.status,
    };

    // eslint-disable-next-line no-console
    console.log("UPDATE PAYLOAD - milestones", { id: m.id, payload: updatePayload });

    const response = await updateMilestone(m.id, updatePayload);

    // eslint-disable-next-line no-console
    console.log("RESPONSE - milestones (update)", response);

    if ((response as any).error) {
      // eslint-disable-next-line no-console
      console.error("ERROR - milestones (update)", (response as any).error);
      throw (response as any).error;
    }

    const { data } = response as any;
    if (data) setMilestones(prev => prev.map(item => item.id === data.id ? (data as Milestone) : item));
  };

  const handleDeleteMilestone = async (mid: string) => {
    await deleteMilestone(mid);
    setMilestones(prev => prev.filter(m => m.id !== mid));
  };

  const handleAddTask = async (payload: { title: string; deadline?: string | null }, milestoneId: string) => {
    if (!project || !user) return;
    const insertPayload = {
      project_id: project.id,
      milestone_id: milestoneId,
      title: payload.title,
      status: "not_done",
      is_completed: false,
      priority: "medium",
      deadline: payload.deadline ? payload.deadline : null,
    };

    // eslint-disable-next-line no-console
    console.log("INSERT PAYLOAD - task_items", insertPayload);

    const response = await createTaskItem(insertPayload as any);

    // eslint-disable-next-line no-console
    console.log("RESPONSE - task_items", response);

    if ((response as any).error) {
      // eslint-disable-next-line no-console
      console.error("ERROR - task_items", (response as any).error);
      throw (response as any).error;
    }

    const updatedTasks = await getTaskItems(project.id);

    // eslint-disable-next-line no-console
    console.log("RESPONSE - task_items (refetch)", updatedTasks);

    if (updatedTasks.error) {
      // eslint-disable-next-line no-console
      console.error("ERROR - task_items (refetch)", updatedTasks.error);
      throw updatedTasks.error;
    }

    setTasks(updatedTasks.data || []);
  };

  const handleUpdateTask = async (tid: string, payload: any) => {
    const updatePayload = payload;

    // eslint-disable-next-line no-console
    console.log("UPDATE PAYLOAD - task_items", { id: tid, payload: updatePayload });

    const response = await updateTaskItem(tid, updatePayload);

    // eslint-disable-next-line no-console
    console.log("RESPONSE - task_items (update)", response);

    if ((response as any).error) {
      // eslint-disable-next-line no-console
      console.error("ERROR - task_items (update)", (response as any).error);
      throw (response as any).error;
    }

    const updatedTasks = await getTaskItems(project?.id ?? "");

    // eslint-disable-next-line no-console
    console.log("RESPONSE - task_items (refetch after update)", updatedTasks);

    if (updatedTasks.error) {
      // eslint-disable-next-line no-console
      console.error("ERROR - task_items (refetch after update)", updatedTasks.error);
      throw updatedTasks.error;
    }

    setTasks(updatedTasks.data || []);
  };

  const handleDeleteTask = async (tid: string) => {
    // eslint-disable-next-line no-console
    console.log("DELETE PAYLOAD - task_items", { id: tid });

    const response = await deleteTaskItem(tid);

    // eslint-disable-next-line no-console
    console.log("RESPONSE - task_items (delete)", response);

    if ((response as any).error) {
      // eslint-disable-next-line no-console
      console.error("ERROR - task_items (delete)", (response as any).error);
      throw (response as any).error;
    }

    const updatedTasks = await getTaskItems(project?.id ?? "");

    // eslint-disable-next-line no-console
    console.log("RESPONSE - task_items (refetch after delete)", updatedTasks);

    if (updatedTasks.error) {
      // eslint-disable-next-line no-console
      console.error("ERROR - task_items (refetch after delete)", updatedTasks.error);
      throw updatedTasks.error;
    }

    setTasks(updatedTasks.data || []);
  };

  const completedTasks = tasks.filter(t => t.status === "done").length;
  const progress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  const renderTab = () => {
    if (!project || !user) return null;

    switch (activeTab) {
      case "overview":
        return (
          <OverviewTab
            project={project}
            milestones={milestones}
            logs={logs}
            onLogSubmit={handleLogSubmit}
            userId={user.id}
            onAddMilestone={handleAddMilestone}
            onUpdateMilestone={handleUpdateMilestone}
            onDeleteMilestone={handleDeleteMilestone}
          />
        );
      case "milestones":
        return (
          <div className="max-w-4xl mx-auto">
             <MilestonesCard
                milestones={milestones.map(m => ({ ...m, item_type: 'milestone' } as any))}
                projectId={project.id}
                userId={user.id}
                onAdd={handleAddMilestone}
                onToggle={(m: any) => handleUpdateMilestone({ ...m, status: m.status === 'completed' ? 'in_progress' : 'completed' })}
                onDelete={handleDeleteMilestone}
                onBulkDelete={async (ids) => { for(const mid of ids) await deleteMilestone(mid); setMilestones(prev => prev.filter(m => !ids.includes(m.id))); }}
             />
          </div>
        );
      case "tasks":
        return (
          <div className="max-w-5xl mx-auto space-y-8">
            {milestones.length === 0 ? (
              <div className="glass-panel p-12 text-center text-slate-500">
                You must create a milestone before adding tasks.
              </div>
            ) : (
              milestones.map(m => (
                <div key={m.id} className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${m.status === 'completed' ? 'bg-emerald-500' : 'bg-primary'}`} />
                      <h3 className="font-bold text-slate-200">{m.title}</h3>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">Tasks: {tasks.filter(t => t.milestone_id === m.id).length}</span>
                  </div>
                  <TasksPanel
                    tasks={tasks.filter(t => t.milestone_id === m.id)}
                    projectId={project.id}
                    userId={user.id}
                    onAdd={(payload) => handleAddTask(payload, m.id)}
                    onUpdate={async (taskId, updates) => {
                      const updatePayload = {
                        priority: updates.priority,
                        status: updates.status,
                        is_completed: updates.status === "done",
                      };
                      await handleUpdateTask(taskId, updatePayload);
                    }}
                    onDelete={handleDeleteTask}
                    onBulkDelete={async (ids) => { for(const tid of ids) await deleteTaskItem(tid); setTasks(prev => prev.filter(t => !ids.includes(t.id))); }}
                  />
                </div>
              ))
            )}
          </div>
        );
      case "reports":
        return (
          <div className="max-w-3xl mx-auto">
            <ReportsCard 
              project={project} 
              onGenerateReport={async (type) => { 
                let content = "";
                if (type === 'today') {
                  const today = new Date().toISOString().split('T')[0];
                  const tLogs = logs.filter(l => l.created_at.startsWith(today));
                  content = `DAILY REPORT - ${today}\nProject: ${project.name}\n${"=".repeat(40)}\n\n`;
                  if (tLogs.length === 0) content += "No logs posted today.";
                  tLogs.forEach(l => {
                    content += `[Team]\n`;
                    content += `COMPLETED: ${l.completed_work}\n`;
                    content += `NEXT STEPS: ${l.next_steps}\n`;
                    content += `BLOCKERS: ${l.blockers || 'None'}\n\n`;
                  });
                } else {
                  content = `FULL PROJECT REPORT - ${project.name}\nGenerated: ${new Date().toLocaleString()}\n${"=".repeat(40)}\n\n`;
                  content += `CURRENT PROGRESS: ${progress}%\n\n`;
                  content += `MILESTONES SUMMARY:\n`;
                  milestones.forEach(m => content += `- ${m.title} [${m.status}]\n`);
                  content += `\nTASK LISTING:\n`;
                  tasks.forEach(t => content += `[${t.status === "done" ? 'X' : ' '}] ${t.title} (${t.priority}, ${t.status})\n`);
                  content += `\nWORK LOG HISTORY:\n`;
                  logs.forEach(l => content += `${l.created_at.split('T')[0]} - User: ${l.completed_work.slice(0, 50)}...\n`);
                }
                await createProjectReport({ project_id: project.id, user_id: user.id, type, content });
                return content;
              }} 
            />
          </div>
        );
      case "team":
        return (
          <div className="max-w-2xl mx-auto">
            <TeamCard 
              members={members.map(m => ({ 
                id: m.user_id, 
                display_name: m.user_profiles?.display_name || 'Team Member', 
                role: m.role, 
                avatarColor: '' 
              }))} 
            />
          </div>
        );
      case "history":
        return (
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="glass-panel p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">🕘</span>
                  <h3 className="font-semibold text-slate-200 text-sm">History</h3>
                </div>
                <span className="text-xs text-slate-500">{historyTotal} logs</span>
              </div>

              {historyLoading ? (
                <div className="py-10 flex items-center justify-center">
                  <InlineSpinner />
                </div>
              ) : historyLogs.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  No logs yet.
                </div>
              ) : (
                <HistoryList
                  project={project}
                  logs={historyLogs}
                  page={historyPage}
                  pageSize={historyPageSize}
                  total={historyTotal}
                  onPageChange={async (p) => {
                    setHistoryPage(p);
                    await loadHistory(p);
                  }}
                  onDeleteSelected={async (ids) => {
                    // eslint-disable-next-line no-console
                    console.log("DELETE PAYLOAD - project_logs", { ids });
                    const resp = await supabase.from("project_logs").delete().in("id", ids);
                    // eslint-disable-next-line no-console
                    console.log("RESPONSE - project_logs (delete selected)", resp);
                    if (resp.error) {
                      // eslint-disable-next-line no-console
                      console.error("ERROR - project_logs (delete selected)", resp.error);
                      throw resp.error;
                    }
                    await loadHistory(historyPage);
                    const updatedLogs = await getProjectLogs(project.id);
                    if (updatedLogs.error) throw updatedLogs.error;
                    setLogs(updatedLogs.data || []);
                  }}
                  onExportSelected={(ids) => {
                    const selected = historyLogs.filter(l => ids.includes(l.id));
                    let content = `Project: ${project.name}\n\n`;
                    selected.forEach((l, idx) => {
                      content += `--- Entry ${idx + 1} ---\n`;
                      content += `Date: ${l.created_at}\n`;
                      content += `Completed: ${l.completed_work ?? ""}\n`;
                      content += `Next Steps: ${l.next_steps ?? ""}\n`;
                      content += `Blockers: ${l.blockers ?? ""}\n`;
                      content += `Notes: ${l.notes ?? ""}\n\n`;
                    });
                    downloadTxt(`${project.name.replace(/\s+/g, "_")}_selected_logs.txt`, content);
                  }}
                />
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) return <div className="flex h-96 items-center justify-center"><InlineSpinner /></div>;
  if (!project) return <div className="p-12 text-center text-slate-500">Project not found.</div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <ProjectHeader 
        project={project} 
        progress={progress} 
        onExport={async () => {
          try {
            const [mRes, tRes, lRes] = await Promise.all([
              getMilestones(project.id),
              getTaskItems(project.id),
              getAllProjectLogs(project.id),
            ]);
            if (mRes.error) throw mRes.error;
            if (tRes.error) throw tRes.error;
            if (lRes.error) throw lRes.error;

            let content = `PROJECT EXPORT\nProject: ${project.name}\nGenerated: ${new Date().toLocaleString()}\n${"=".repeat(50)}\n\n`;
            content += `MILESTONES:\n`;
            (mRes.data || []).forEach((m) => {
              content += `- ${m.title} [${m.status}]\n`;
            });

            content += `\nTASKS:\n`;
            (tRes.data || []).forEach((t) => {
              content += `- ${t.title} | priority=${t.priority} | status=${t.status}\n`;
            });

            content += `\nLOGS:\n`;
            (lRes.data || []).forEach((l) => {
              content += `\n[${l.created_at}]\n`;
              content += `Completed: ${l.completed_work ?? ""}\n`;
              content += `Next Steps: ${l.next_steps ?? ""}\n`;
              content += `Blockers: ${l.blockers ?? ""}\n`;
              content += `Notes: ${l.notes ?? ""}\n`;
            });

            downloadTxt(`${project.name.replace(/\s+/g, "_")}_full_export.txt`, content);
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error("ERROR - export full project", error);
            window.alert("Export failed. Check console for details.");
          }
        }} 
        onGenerateReport={() => {
          try {
            const latest = logs[0];
            if (!latest) {
              window.alert("No logs yet for today’s report.");
              return;
            }
            const content =
              `Project: ${project.name}\n\n` +
              `Completed Work:\n${latest.completed_work ?? ""}\n\n` +
              `Next Steps:\n${latest.next_steps ?? ""}\n\n` +
              `Blockers:\n${latest.blockers ?? ""}\n\n` +
              `Notes:\n${latest.notes ?? ""}\n`;
            downloadTxt(`${project.name.replace(/\s+/g, "_")}_today_report.txt`, content);
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error("ERROR - generate today report", error);
            window.alert("Report generation failed. Check console for details.");
          }
        }} 
        onAddUpdate={() => setShowUpdateModal(true)} 
      />
      <div className="glass-panel overflow-hidden">
        <ProjectTabs activeTab={activeTab} onChange={setActiveTab} />
      </div>
      <div className="pb-12">{renderTab()}</div>

      {showUpdateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-3xl space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="text-sm font-semibold text-slate-200">Add Update</div>
              <button
                className="text-slate-400 hover:text-slate-200 transition"
                onClick={() => setShowUpdateModal(false)}
              >
                ×
              </button>
            </div>
            <WorkLogCard
              onSubmit={async (p) => {
                await handleLogSubmit(p);
                setShowUpdateModal(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectManagerPage;

