import { useEffect, useState, useMemo, useCallback } from "react";
import useAppStore from "../store/useAppStore";
import { useMeetings } from "../hooks/useMeetings";
import type { MeetingLink } from "../api/meetingsApi";
import { logAppEvent } from "../utils/appLogger";
import BulkDeleteBar from "../components/BulkDeleteBar";
import IndeterminateCheckbox from "../components/IndeterminateCheckbox";
import InlineSpinner from "../components/InlineSpinner";
import PaginationControls from "../components/PaginationControls";
import { useBulkSelection } from "../hooks/useBulkSelection";
import { usePagination } from "../hooks/usePagination";
import { useLocation } from "react-router-dom";
import ModuleHeader from "../components/ModuleHeader";

const platformColor = (p: string) => {
  switch (p.toLowerCase()) {
    case "zoom": return "text-blue-400 bg-blue-400/10";
    case "google meet": return "text-emerald-400 bg-emerald-400/10";
    case "teams": return "text-indigo-400 bg-indigo-400/10";
    default: return "text-fg-muted bg-fg-muted/10";
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
  const { 
    meetings, 
    loading: meetingsLoading, 
    addMeeting, 
    updateMeeting: updateMeetingHook, 
    removeMeeting 
  } = useMeetings();

  const user = useAppStore((s) => s.user);
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingLink | null>(null);
  const [form, setForm] = useState({ title: "", platform: "Zoom", meeting_url: "", date: "", time: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [deletingBulk, setDeletingBulk] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; message: string; type: string }[]>([]);
  const [notifiedSet, setNotifiedSet] = useState<Set<string>>(new Set());

  const location = useLocation();

  // Log meetings page view
  useEffect(() => {
    if (user && meetings.length > 0) {
      void logAppEvent({
        type: "info",
        module: "meetings",
        message: `Viewed meetings page with ${meetings.length} meetings`,
        meta: { meetingCount: meetings.length },
      });
    }
  }, [user, meetings.length]);

  useEffect(() => {
    if (!selectedMeeting) {
      const now = new Date();
      now.setMinutes(now.getMinutes() + 15);
      const incomingDate = location.state?.createForDate;
      setForm({
        title: "",
        platform: "Zoom",
        meeting_url: "",
        date: incomingDate || now.toISOString().split("T")[0],
        time: now.toTimeString().substring(0, 5),
        description: "",
      });
      if (incomingDate) {
        window.history.replaceState({}, document.title);
      }
    } else {
      const d = new Date(selectedMeeting.scheduled_at);
      setForm({
        title: selectedMeeting.title,
        platform: selectedMeeting.platform,
        meeting_url: selectedMeeting.meeting_url,
        date: d.toISOString().split("T")[0],
        time: d.toTimeString().substring(0, 5),
        description: selectedMeeting.description || "",
      });
    }
  }, [selectedMeeting, location.state]);

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

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.hidden) return;

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
      user_id: user.id
    };

    try {
      if (selectedMeeting) {
        await updateMeetingHook(selectedMeeting.id, payload);
      } else {
        await addMeeting(payload);
      }
      setSelectedMeeting(null);
    } catch (err: any) {
      addToast(err.message || "Failed to save meeting", "urgent");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!window.confirm("Delete this meeting?")) return;
    try {
      await removeMeeting(id);
      if (selectedMeeting?.id === id) setSelectedMeeting(null);
    } catch (err: any) {
      addToast(err.message || "Failed to delete", "urgent");
    }
  };

  const handleBulkDelete = async (ids: string[]) => {
    if (!window.confirm("Delete selected meetings?")) return;
    setDeletingBulk(true);
    try {
      await Promise.all(ids.map(id => removeMeeting(id)));
    } catch (err: any) {
      addToast(err.message || "Bulk delete failed", "urgent");
    } finally {
      setDeletingBulk(false);
    }
  };

  const launchMeeting = (url: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    let finalUrl = url;
    if (!url.startsWith("http://") && !url.startsWith("https://")) finalUrl = `https://${url}`;
    window.open(finalUrl, "_blank", "noopener,noreferrer");
  };

  const sortedMeetings = useMemo(() => {
    return [...meetings].sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
  }, [meetings]);

  const now = new Date();
  const upcomingMeetings = sortedMeetings.filter((m) => new Date(m.scheduled_at).getTime() >= now.getTime() - 60000 * 30);
  const pastMeetings = sortedMeetings.filter((m) => new Date(m.scheduled_at).getTime() < now.getTime() - 60000 * 30).reverse();

  const upcomingPagination = usePagination(upcomingMeetings);
  const pastPagination = usePagination(pastMeetings);
  const upcomingSelection = useBulkSelection(upcomingMeetings, (meeting: MeetingLink) => meeting.id);
  const pastSelection = useBulkSelection(pastMeetings, (meeting: MeetingLink) => meeting.id);
  const upcomingPageState = upcomingSelection.getPageState(upcomingPagination.paginatedItems);

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
    const ids = Array.from(selection.selectedIds);
    await handleBulkDelete(ids);
    if (selectedMeeting && selection.selectedIds.has(selectedMeeting.id)) setSelectedMeeting(null);
    upcomingSelection.clearSelection();
    pastSelection.clearSelection();
  };

  return (
    <div className="min-h-[calc(100vh-theme(spacing.16))] flex flex-col lg:flex-row gap-4 lg:gap-6 relative pb-4">
      <div className="absolute top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-md shadow-xl text-sm font-medium border flex items-center gap-3 pointer-events-auto ${t.type === "urgent" ? "bg-rose-900/90 border-rose-700 text-rose-100" : "bg-surface/90 border-stroke text-fg backdrop-blur"}`}
          >
            <span>{t.type === "urgent" ? "Alert" : "Bell"}</span>
            {t.message}
          </div>
        ))}
      </div>

      <div className="flex-1 flex flex-col min-h-0 bg-panel/40 rounded-2xl border border-stroke overflow-hidden backdrop-blur-sm">
        <ModuleHeader
          title="Meeting"
          description="SCHEDULE AND JOIN VIRTUAL MEETINGS"
          icon="🗓️"
        >
          <button
            onClick={() => setSelectedMeeting(null)}
            className="btn-primary py-2 px-4 text-xs font-bold"
          >
            New Meeting
          </button>
        </ModuleHeader>

        {meetingsLoading ? (
            <div className="flex h-64 items-center justify-center">
              <InlineSpinner />
            </div>
          ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
             <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs uppercase tracking-widest text-fg-muted font-bold">Upcoming</h3>
                  <BulkDeleteBar 
                    count={upcomingSelection.selectedCount} 
                    label="upcoming meetings"
                    onDelete={() => deleteSelected(upcomingSelection)} 
                    onClear={() => upcomingSelection.clearSelection()}
                    busy={deletingBulk}
                  />
                </div>
                
                <div className="grid gap-3">
                   <div className="flex items-center gap-3 px-4 py-2 text-xxs uppercase tracking-wider text-fg-muted font-bold border-b border-stroke">
                      <IndeterminateCheckbox 
                        checked={upcomingPageState.checked}
                        indeterminate={upcomingPageState.indeterminate}
                        onChange={() => upcomingSelection.togglePage(upcomingPagination.paginatedItems)}
                        ariaLabel="toggle select all upcoming"
                      />
                      <span className="flex-1">Meeting Details</span>
                      <span className="w-32 text-center">Countdown</span>
                      <span className="w-24 text-right">Actions</span>
                   </div>
                   
                   {upcomingPagination.paginatedItems.map(m => (
                      <div key={m.id} className="group flex items-center gap-3 px-4 py-3 hover:bg-surface/40 rounded-lg transition-colors border border-transparent hover:border-stroke/50">
                         <input 
                            type="checkbox" 
                            checked={upcomingSelection.isSelected(m.id)}
                            onChange={() => upcomingSelection.toggleOne(m.id)}
                            className="rounded border-stroke bg-surface text-primary focus:ring-primary/20"
                         />
                         <div className="flex-1 min-w-0" onClick={() => setSelectedMeeting(m)}>
                            <div className="flex items-center gap-2">
                               <span className="text-fg font-medium truncate">{m.title}</span>
                               <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tight ${platformColor(m.platform)}`}>
                                  {m.platform}
                               </span>
                            </div>
                            <div className="text-xs text-fg-muted mt-0.5 font-mono">
                               {new Date(m.scheduled_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                            </div>
                         </div>
                         <div className="w-32 text-center">
                            <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded">
                               {getCountdownText(m.scheduled_at)}
                            </span>
                         </div>
                         <div className="w-24 flex justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => launchMeeting(m.meeting_url, e)} className="p-1.5 hover:bg-primary/20 rounded text-primary" title="Join">🚀</button>
                            <button onClick={(e) => handleDelete(m.id, e)} className="p-1.5 hover:bg-rose-500/20 rounded text-rose-400" title="Delete">🗑️</button>
                         </div>
                      </div>
                   ))}

                   {upcomingMeetings.length === 0 && (
                      <div className="py-12 text-center text-fg-muted text-sm border border-dashed border-stroke rounded-xl bg-surface/20">
                         No upcoming meetings.
                      </div>
                   )}
                </div>
                
                {upcomingMeetings.length > upcomingPagination.pageSize && (
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
                )}
             </div>

             <div className="space-y-4 pt-4 border-t border-stroke/50">
                <div className="flex items-center justify-between">
                   <h3 className="text-xs uppercase tracking-widest text-fg-muted font-bold">Past Meetings</h3>
                   <BulkDeleteBar 
                    count={pastSelection.selectedCount} 
                    label="past meetings"
                    onDelete={() => deleteSelected(pastSelection)} 
                    onClear={() => pastSelection.clearSelection()}
                    busy={deletingBulk}
                  />
                </div>

                <div className="grid gap-2 opacity-60 hover:opacity-100 transition-opacity">
                   {pastPagination.paginatedItems.map(m => (
                      <div key={m.id} className="group flex items-center gap-3 px-4 py-2 hover:bg-surface/30 rounded-lg transition-colors">
                         <input 
                            type="checkbox" 
                            checked={pastSelection.isSelected(m.id)}
                            onChange={() => pastSelection.toggleOne(m.id)}
                            className="rounded border-stroke bg-panel text-primary/40 focus:ring-primary/10"
                         />
                         <div className="flex-1 min-w-0" onClick={() => setSelectedMeeting(m)}>
                            <div className="flex items-center gap-2">
                               <span className="text-fg-muted text-sm truncate">{m.title}</span>
                               <span className="text-[9px] text-fg-muted">{m.platform}</span>
                            </div>
                         </div>
                         <div className="text-right flex items-center gap-3">
                            <span className="text-xxs font-mono text-fg-muted">
                               {new Date(m.scheduled_at).toLocaleDateString()}
                            </span>
                            <button onClick={(e) => handleDelete(m.id, e)} className="p-1.5 hover:bg-rose-500/10 rounded text-rose-500/40 opacity-70 group-hover:opacity-100">🗑️</button>
                         </div>
                      </div>
                   ))}
                </div>

                {pastMeetings.length > pastPagination.pageSize && (
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
                )}
             </div>
          </div>
        )}
      </div>

      <div className="w-full lg:w-[400px] shrink-0 bg-surface rounded-2xl border border-stroke shadow-2xl overflow-hidden flex flex-col lg:h-full">
         <div className="p-6 border-b border-stroke bg-surface/20 backdrop-blur-md">
            <h2 className="text-lg font-bold text-fg flex items-center gap-2">
               <span>{selectedMeeting ? "📅 Edit Meeting" : "✨ New Meeting"}</span>
            </h2>
            <p className="text-xs text-fg-muted mt-1 uppercase tracking-wider font-medium">Configure meeting details</p>
         </div>

         <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
            <form id="meeting-form" onSubmit={handleSave} className="space-y-5">
               <div className="space-y-1.5">
                  <label className="text-xxs uppercase tracking-widest text-fg-muted font-bold ml-1">Title</label>
                  <input
                    required
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    className="w-full rounded-xl bg-panel border border-stroke px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition placeholder:text-fg-muted text-fg"
                    placeholder="E.g. Daily Standup"
                  />
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                     <label className="text-xxs uppercase tracking-widest text-fg-muted font-bold ml-1">Platform</label>
                     <select
                       value={form.platform}
                       onChange={e => setForm({ ...form, platform: e.target.value })}
                       className="w-full rounded-xl bg-panel border border-stroke px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-fg"
                     >
                        <option>Zoom</option>
                        <option>Google Meet</option>
                        <option>Teams</option>
                        <option>Other</option>
                     </select>
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-xxs uppercase tracking-widest text-fg-muted font-bold ml-1">Date</label>
                     <input
                       type="date"
                       required
                       value={form.date}
                       onChange={e => setForm({ ...form, date: e.target.value })}
                       className="w-full rounded-xl bg-panel border border-stroke px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-fg"
                     />
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                     <label className="text-xxs uppercase tracking-widest text-fg-muted font-bold ml-1">Time</label>
                     <input
                       type="time"
                       required
                       value={form.time}
                       onChange={e => setForm({ ...form, time: e.target.value })}
                       className="w-full rounded-xl bg-panel border border-stroke px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-fg"
                     />
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-xxs uppercase tracking-widest text-fg-muted font-bold ml-1">Join URL</label>
                     <input
                       required
                       value={form.meeting_url}
                       onChange={e => setForm({ ...form, meeting_url: e.target.value })}
                       className="w-full rounded-xl bg-panel border border-stroke px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition placeholder:text-fg-muted text-fg font-mono"
                       placeholder="https://..."
                     />
                  </div>
               </div>

               <div className="space-y-1.5">
                  <label className="text-xxs uppercase tracking-widest text-fg-muted font-bold ml-1">Description</label>
                  <textarea
                    rows={4}
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    className="w-full rounded-xl bg-panel border border-stroke px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition placeholder:text-fg-muted text-fg resize-none"
                    placeholder="Notes, agenda, or topics..."
                  />
               </div>
            </form>
         </div>

         <div className="p-6 border-t border-stroke bg-surface/10 backdrop-blur-md flex items-center justify-between gap-4">
            {selectedMeeting ? (
               <button 
                  type="button" 
                  onClick={() => setSelectedMeeting(null)}
                  className="flex-1 py-3 text-xs font-bold text-fg-muted hover:text-fg-secondary"
               >
                  Cancel
               </button>
            ) : null}
            <button
              form="meeting-form"
              disabled={saving}
              className={`flex-[2] py-3 rounded-xl bg-primary text-on-primary text-sm font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition flex items-center justify-center gap-2 ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
               {saving ? <div className="w-4 h-4 border-2 border-stroke/30 border-t-slate-900 rounded-full animate-spin" /> : null}
               {selectedMeeting ? "Update Meeting" : "Schedule Meeting"}
            </button>
         </div>
      </div>
    </div>
  );
};

export default MeetingsPage;
