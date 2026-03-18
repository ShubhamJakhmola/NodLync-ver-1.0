import { useEffect, useState, useMemo, useCallback } from "react";
import useAppStore from "../store/useAppStore";
import {
  getMeetings,
  createMeeting,
  updateMeeting,
  deleteMeeting,
  type MeetingLink,
} from "../api/meetingsApi";
import BulkDeleteBar from "../components/BulkDeleteBar";
import IndeterminateCheckbox from "../components/IndeterminateCheckbox";
import InlineSpinner from "../components/InlineSpinner";
import PaginationControls from "../components/PaginationControls";
import { useBulkSelection } from "../hooks/useBulkSelection";
import { usePagination } from "../hooks/usePagination";

const platformColor = (p: string) => {
  switch (p.toLowerCase()) {
    case "zoom": return "text-blue-400 bg-blue-400/10";
    case "google meet": return "text-emerald-400 bg-emerald-400/10";
    case "teams": return "text-indigo-400 bg-indigo-400/10";
    default: return "text-slate-400 bg-slate-400/10";
  }
};

const playBeep = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(523.25, ctx.currentTime);
    osc.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch {
    // ignore
  }
};

const MeetingsPage = () => {
  const user = useAppStore((s) => s.user);
  const [meetings, setMeetings] = useState<MeetingLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingLink | null>(null);
  const [form, setForm] = useState({ title: "", platform: "Zoom", meeting_url: "", date: "", time: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [deletingBulk, setDeletingBulk] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; message: string; type: string }[]>([]);
  const [notifiedSet, setNotifiedSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!selectedMeeting) {
      const now = new Date();
      now.setMinutes(now.getMinutes() + 15);
      setForm({
        title: "",
        platform: "Zoom",
        meeting_url: "",
        date: now.toISOString().split("T")[0],
        time: now.toTimeString().substring(0, 5),
        description: "",
      });
    } else {
      const d = new Date(selectedMeeting.scheduled_at);
      setForm({
        title: selectedMeeting.title,
        platform: selectedMeeting.platform,
        meeting_url: selectedMeeting.meeting_url,
        date: isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0],
        time: isNaN(d.getTime()) ? "" : d.toTimeString().substring(0, 5),
        description: selectedMeeting.description || "",
      });
    }
  }, [selectedMeeting]);

  const addToast = useCallback((msg: string, type: "info" | "urgent") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message: msg, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 8000);
  }, []);

  const notifyBrowser = useCallback((title: string, body: string) => {
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification(title, { body, icon: "/favicon.svg" });
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") new Notification(title, { body, icon: "/favicon.svg" });
        });
      }
    }
  }, []);

  const fetchMeetings = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await getMeetings(user.id);
    setMeetings(data);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchMeetings();
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, [fetchMeetings]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      meetings.forEach((m) => {
        const mTime = new Date(m.scheduled_at);
        if (isNaN(mTime.getTime())) return;
        const diffMinutes = Math.round((mTime.getTime() - now.getTime()) / 60000);
        if (diffMinutes === 10) {
          const notifKey = `${m.id}-10m`;
          if (!notifiedSet.has(notifKey)) {
            playBeep();
            addToast(`Upcoming: ${m.title} in 10 minutes!`, "info");
            notifyBrowser("Upcoming Meeting", `${m.title} starting in 10 mins`);
            setNotifiedSet((prev) => new Set(prev).add(notifKey));
          }
        }
        if (diffMinutes === 0) {
          const notifKey = `${m.id}-0m`;
          if (!notifiedSet.has(notifKey)) {
            playBeep();
            addToast(`Starting Now: ${m.title}`, "urgent");
            notifyBrowser("Meeting Starting!", `Join ${m.title} now.`);
            setNotifiedSet((prev) => new Set(prev).add(notifKey));
          }
        }
      });
      setMeetings((prev) => [...prev]);
    }, 30000);
    return () => clearInterval(interval);
  }, [meetings, notifiedSet, addToast, notifyBrowser]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const scheduledAt = new Date(`${form.date}T${form.time}:00`);
    if (isNaN(scheduledAt.getTime())) {
      alert("Invalid date or time");
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title,
      platform: form.platform,
      meeting_url: form.meeting_url,
      description: form.description,
      scheduled_at: scheduledAt.toISOString(),
    };

    if (selectedMeeting) {
      const { data, error } = await updateMeeting(selectedMeeting.id, payload);
      if (error) alert(`Failed to update: ${error?.message || "Did you run the SQL schema?"}`);
      else if (data) {
        setMeetings((prev) => prev.map((m) => (m.id === data.id ? data : m)));
        setSelectedMeeting(null);
      }
    } else {
      const { data, error } = await createMeeting({ ...payload, user_id: user.id });
      if (error) alert(`Failed to save: ${error?.message || "Did you run the SQL schema?"}`);
      else if (data) {
        setMeetings((prev) => [data, ...prev]);
        setSelectedMeeting(null);
      }
    }
    setSaving(false);
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!window.confirm("Delete this meeting?")) return;
    await deleteMeeting(id);
    setMeetings((prev) => prev.filter((m) => m.id !== id));
    if (selectedMeeting?.id === id) setSelectedMeeting(null);
  };

  const launchMeeting = (url: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    let finalUrl = url;
    if (!url.startsWith("http://") && !url.startsWith("https://")) finalUrl = `https://${url}`;
    window.open(finalUrl, "_blank", "noopener,noreferrer");
  };

  const now = new Date();
  const sortedMeetings = useMemo(() => [...meetings].sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()), [meetings]);
  const upcomingMeetings = sortedMeetings.filter((m) => new Date(m.scheduled_at).getTime() >= now.getTime() - 60000 * 30);
  const pastMeetings = sortedMeetings.filter((m) => new Date(m.scheduled_at).getTime() < now.getTime() - 60000 * 30).reverse();
  const upcomingPagination = usePagination(upcomingMeetings);
  const pastPagination = usePagination(pastMeetings);
  const upcomingSelection = useBulkSelection(upcomingMeetings, (meeting) => meeting.id);
  const pastSelection = useBulkSelection(pastMeetings, (meeting) => meeting.id);
  const upcomingPageState = upcomingSelection.getPageState(upcomingPagination.paginatedItems);
  const pastPageState = pastSelection.getPageState(pastPagination.paginatedItems);

  const getCountdownText = (isoString: string) => {
    const d = new Date(isoString);
    const diffMs = d.getTime() - now.getTime();
    if (diffMs < 0) return "Started";
    const diffMins = Math.round(diffMs / 60000);
    if (diffMins < 60) return `in ${diffMins} min`;
    const diffHours = Math.round(diffMins / 60);
    if (diffHours < 24) return `in ${diffHours} hr`;
    return `in ${Math.round(diffHours / 24)} d`;
  };

  const deleteSelected = async (selection: ReturnType<typeof useBulkSelection<MeetingLink>>) => {
    if (selection.selectedCount === 0) return;
    if (!window.confirm(`Delete ${selection.selectedCount} selected meeting(s)?`)) return;
    setDeletingBulk(true);
    const ids = Array.from(selection.selectedIds);
    await Promise.all(ids.map((id) => deleteMeeting(id)));
    setMeetings((prev) => prev.filter((meeting) => !selection.selectedIds.has(meeting.id)));
    if (selectedMeeting && selection.selectedIds.has(selectedMeeting.id)) setSelectedMeeting(null);
    upcomingSelection.clearSelection();
    pastSelection.clearSelection();
    setDeletingBulk(false);
  };

  return (
    <div className="h-[calc(100vh-theme(spacing.16))] flex flex-col xl:flex-row gap-6 relative">
      <div className="absolute top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-md shadow-xl text-sm font-medium border flex items-center gap-3 pointer-events-auto ${t.type === "urgent" ? "bg-rose-900/90 border-rose-700 text-rose-100" : "bg-surface/90 border-slate-700 text-slate-100 backdrop-blur"}`}
          >
            <span>{t.type === "urgent" ? "Alert" : "Bell"}</span>
            {t.message}
          </div>
        ))}
      </div>

      <div className="flex-1 flex flex-col gap-4 min-h-0 overflow-y-auto pr-2 pb-8 custom-scrollbar">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">Calendar</span>
            <h2 className="text-lg font-bold text-slate-100 uppercase tracking-widest">Meetings</h2>
          </div>
          <button className="btn-primary text-sm px-4 py-2 xl:hidden" onClick={() => setSelectedMeeting(null)}>
            + Schedule
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center p-12"><InlineSpinner /></div>
        ) : (
          <>
            <div>
              <div className="flex items-center justify-between gap-3 mb-3 sticky top-0 bg-background/95 backdrop-blur py-2 z-10">
                <h3 className="text-slate-400 font-semibold">Upcoming Meetings</h3>
              </div>

              <BulkDeleteBar
                count={upcomingSelection.selectedCount}
                label="upcoming meetings"
                onDelete={() => deleteSelected(upcomingSelection)}
                onClear={upcomingSelection.clearSelection}
                busy={deletingBulk}
              />

              {upcomingMeetings.length === 0 ? (
                <div className="glass-panel p-8 text-center text-slate-500 border-dashed mt-3">No upcoming meetings scheduled.</div>
              ) : (
                <div className="flex flex-col gap-3 mt-3">
                  <div className="flex items-center gap-3 px-2 py-2 text-sm text-slate-400">
                    <IndeterminateCheckbox
                      checked={upcomingPageState.checked}
                      indeterminate={upcomingPageState.indeterminate}
                      onChange={() => upcomingSelection.togglePage(upcomingPagination.paginatedItems)}
                      ariaLabel="Select all visible upcoming meetings"
                    />
                    <span>Select visible meetings</span>
                  </div>
                  {upcomingPagination.paginatedItems.map((m) => {
                    const mDate = new Date(m.scheduled_at);
                    const diffMins = Math.round((mDate.getTime() - now.getTime()) / 60000);
                    const isSoon = diffMins >= 0 && diffMins <= 30;
                    return (
                      <div
                        key={m.id}
                        onClick={() => setSelectedMeeting(m)}
                        className={`glass-panel p-4 flex flex-col sm:flex-row sm:items-center gap-4 cursor-pointer transition hover:border-slate-500 ${selectedMeeting?.id === m.id ? "border-primary shadow-[0_0_15px_rgba(56,189,248,0.15)]" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={upcomingSelection.isSelected(m.id)}
                          onChange={() => upcomingSelection.toggleOne(m.id)}
                          onClick={(event) => event.stopPropagation()}
                          className="h-4 w-4 accent-primary mt-1"
                          aria-label={`Select ${m.title}`}
                        />
                        <div className="flex-1 flex flex-col min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${platformColor(m.platform)}`}>{m.platform}</span>
                            {isSoon ? <span className="text-[10px] bg-red-500/20 text-red-400 font-bold px-2 py-0.5 rounded animate-pulse">SOON</span> : null}
                          </div>
                          <h4 className="text-slate-100 font-bold truncate text-lg" title={m.title}>{m.title}</h4>
                          <p className="text-sm text-slate-400">{mDate.toLocaleDateString()} at {mDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                        </div>
                        <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end">
                          <div className="text-right">
                            <span className="text-sm font-medium text-slate-300 bg-slate-800/50 px-3 py-1.5 rounded-md inline-block">{getCountdownText(m.scheduled_at)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={(e) => handleDelete(m.id, e)} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition" title="Delete">×</button>
                            <button onClick={(e) => launchMeeting(m.meeting_url, e)} className="btn-primary">Join Now</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {upcomingMeetings.length > 0 ? (
                <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/20">
                  <PaginationControls
                    currentPage={upcomingPagination.currentPage}
                    pageSize={upcomingPagination.pageSize}
                    totalItems={upcomingPagination.totalItems}
                    totalPages={upcomingPagination.totalPages}
                    startItem={upcomingPagination.startItem}
                    endItem={upcomingPagination.endItem}
                    onPageChange={upcomingPagination.setCurrentPage}
                    onPageSizeChange={upcomingPagination.setPageSize}
                    itemLabel="upcoming meetings"
                  />
                </div>
              ) : null}
            </div>

            <div className="mt-8">
              <div className="flex items-center justify-between gap-3 mb-3 sticky top-0 bg-background/95 backdrop-blur py-2 z-10">
                <h3 className="text-slate-400 font-semibold">Past Meetings</h3>
              </div>

              <BulkDeleteBar
                count={pastSelection.selectedCount}
                label="past meetings"
                onDelete={() => deleteSelected(pastSelection)}
                onClear={pastSelection.clearSelection}
                busy={deletingBulk}
              />

              {pastMeetings.length === 0 ? (
                <div className="text-sm text-slate-500 italic pl-2 mt-3">No past meetings.</div>
              ) : (
                <div className="flex flex-col gap-2 opacity-60 hover:opacity-100 transition duration-300 mt-3">
                  <div className="flex items-center gap-3 px-2 py-2 text-sm text-slate-400">
                    <IndeterminateCheckbox
                      checked={pastPageState.checked}
                      indeterminate={pastPageState.indeterminate}
                      onChange={() => pastSelection.togglePage(pastPagination.paginatedItems)}
                      ariaLabel="Select all visible past meetings"
                    />
                    <span>Select visible meetings</span>
                  </div>
                  {pastPagination.paginatedItems.map((m) => {
                    const mDate = new Date(m.scheduled_at);
                    return (
                      <div
                        key={m.id}
                        onClick={() => setSelectedMeeting(m)}
                        className={`bg-surface border border-slate-800 p-3 rounded-lg flex items-center gap-3 cursor-pointer hover:bg-slate-800/50 transition ${selectedMeeting?.id === m.id ? "border-primary/50" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={pastSelection.isSelected(m.id)}
                          onChange={() => pastSelection.toggleOne(m.id)}
                          onClick={(event) => event.stopPropagation()}
                          className="h-4 w-4 accent-primary"
                          aria-label={`Select ${m.title}`}
                        />
                        <div className="flex items-center gap-3 w-full">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shrink-0 ${platformColor(m.platform)}`}>{m.platform}</span>
                          <span className="text-slate-300 font-medium truncate flex-1">{m.title}</span>
                          <button onClick={(e) => handleDelete(m.id, e)} className="text-slate-500 hover:text-rose-400 transition text-sm" title="Delete">×</button>
                          <span className="text-xs text-slate-500 tabular-nums shrink-0">{mDate.toLocaleDateString()} {mDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {pastMeetings.length > 0 ? (
                <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/20">
                  <PaginationControls
                    currentPage={pastPagination.currentPage}
                    pageSize={pastPagination.pageSize}
                    totalItems={pastPagination.totalItems}
                    totalPages={pastPagination.totalPages}
                    startItem={pastPagination.startItem}
                    endItem={pastPagination.endItem}
                    onPageChange={pastPagination.setCurrentPage}
                    onPageSizeChange={pastPagination.setPageSize}
                    itemLabel="past meetings"
                  />
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>

      <div className="xl:w-96 flex flex-col shrink-0">
        <div className="glass-panel flex-1 flex flex-col p-5 sticky top-0">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
            <h2 className="text-lg font-bold text-slate-200">{selectedMeeting ? "Edit Meeting" : "Schedule New"}</h2>
            {selectedMeeting ? <button type="button" onClick={() => setSelectedMeeting(null)} className="text-primary text-sm hover:underline">+ New</button> : null}
          </div>

          <form onSubmit={handleSave} className="flex flex-col gap-4 flex-1 overflow-y-auto pr-1">
            <label className="block space-y-1">
              <span className="text-sm text-slate-400">Meeting Title <span className="text-rose-500">*</span></span>
              <input className="w-full bg-surface border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary" placeholder="E.g. Daily Standup" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-sm text-slate-400">Date <span className="text-rose-500">*</span></span>
                <input type="date" className="w-full bg-surface border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </label>
              <label className="block space-y-1">
                <span className="text-sm text-slate-400">Time (Local) <span className="text-rose-500">*</span></span>
                <input type="time" className="w-full bg-surface border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary" required value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
              </label>
            </div>
            <label className="block space-y-1">
              <span className="text-sm text-slate-400">Platform</span>
              <select className="w-full bg-surface border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary appearance-none" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>
                <option value="Zoom">Zoom</option>
                <option value="Google Meet">Google Meet</option>
                <option value="Teams">Microsoft Teams</option>
                <option value="Custom">Other / Custom</option>
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-sm text-slate-400">Meeting URL <span className="text-rose-500">*</span></span>
              <input className="w-full bg-surface border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary font-mono text-xs" placeholder="https://zoom.us/j/..." required value={form.meeting_url} onChange={(e) => setForm({ ...form, meeting_url: e.target.value })} />
            </label>
            <label className="block space-y-1 flex-1">
              <span className="text-sm text-slate-400">Description / Passcode</span>
              <textarea className="w-full h-24 bg-surface border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary resize-none" placeholder="Optional details, agenda, or passcodes..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </label>
            <div className="pt-4 border-t border-slate-800 mt-auto">
              <button type="submit" disabled={saving || !form.title || !form.meeting_url || !form.date || !form.time} className="btn-primary w-full py-2.5 flex items-center justify-center gap-2 text-sm font-semibold">
                {saving ? "Saving..." : selectedMeeting ? "Update Meeting" : "Schedule Meeting"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MeetingsPage;

