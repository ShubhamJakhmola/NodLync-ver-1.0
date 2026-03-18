import { useEffect, useState, useMemo, useCallback } from "react";
import useAppStore from "../store/useAppStore";
import {
  getMeetings,
  createMeeting,
  updateMeeting,
  deleteMeeting,
  type MeetingLink,
} from "../api/meetingsApi";
import InlineSpinner from "../components/InlineSpinner";

// ── Icons for Platforms ──
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
    osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    osc.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch (err) {
    // Ignore audio errors silently
  }
};

const MeetingsPage = () => {
  const user = useAppStore((s) => s.user);

  // States
  const [meetings, setMeetings] = useState<MeetingLink[]>([]);
  const [loading, setLoading] = useState(true);

  // The item being edited (or null if create mode)
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingLink | null>(null);

  // Form State
  const [form, setForm] = useState({
    title: "",
    platform: "Zoom",
    meeting_url: "",
    date: "",
    time: "",
    description: "",
  });
  const [saving, setSaving] = useState(false);

  // Notifications state (for basic in-app toasts)
  const [toasts, setToasts] = useState<{ id: number; message: string; type: string }[]>([]);

  // Ref to track which meeting IDs we've already notified for (so we don't spam)
  const [notifiedSet, setNotifiedSet] = useState<Set<string>>(new Set());

  // Init Form (e.g. today's date)
  useEffect(() => {
    if (!selectedMeeting) {
      const now = new Date();
      now.setMinutes(now.getMinutes() + 15);
      const isoDate = now.toISOString().split("T")[0];
      const isoTime = now.toTimeString().substring(0, 5);
      setForm({
        title: "",
        platform: "Zoom",
        meeting_url: "",
        date: isoDate,
        time: isoTime,
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

  // Toast helper
  const addToast = useCallback((msg: string, type: "info" | "urgent") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message: msg, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 8000);
  }, []);

  // Browser Notification helper
  const notifyBrowser = useCallback((title: string, body: string) => {
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification(title, { body, icon: "/favicon.svg" });
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") {
            new Notification(title, { body, icon: "/favicon.svg" });
          }
        });
      }
    }
  }, []);

  // Fetch Meetings
  const fetchMeetings = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await getMeetings(user.id);
    setMeetings(data);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchMeetings();
    // Ask for browser notification permission right away
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, [fetchMeetings]);

  // Tick every 30 seconds for alerts & refreshing list layout
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      
      meetings.forEach((m) => {
        const mTime = new Date(m.scheduled_at);
        if (isNaN(mTime.getTime())) return;

        const diffMinutes = Math.round((mTime.getTime() - now.getTime()) / 60000);

        // Alert Types:
        // 1. 10 min warning
        if (diffMinutes === 10) {
          const notifKey = `${m.id}-10m`;
          if (!notifiedSet.has(notifKey)) {
            playBeep();
            addToast(`Upcoming: ${m.title} in 10 minutes!`, "info");
            notifyBrowser("Upcoming Meeting", `${m.title} starting in 10 mins`);
            setNotifiedSet((prev) => new Set(prev).add(notifKey));
            console.log(`[ALERT] 10m warning triggered for ${m.title}`);
          }
        }
        
        // 2. 0 min (Starting Now)
        if (diffMinutes === 0) {
          const notifKey = `${m.id}-0m`;
          if (!notifiedSet.has(notifKey)) {
            playBeep();
            addToast(`Starting Now: ${m.title}`, "urgent");
            notifyBrowser("Meeting Starting!", `Join ${m.title} now.`);
            setNotifiedSet((prev) => new Set(prev).add(notifKey));
            console.log(`[ALERT] 0m immediate warning triggered for ${m.title}`);
          }
        }
      });
      
      // Force a slight re-render so "Past/Upcoming" splits neatly when time passes
      setMeetings((prev) => [...prev]);
      
    }, 30000);
    return () => clearInterval(interval);
  }, [meetings, notifiedSet, addToast, notifyBrowser]);

  // Handle Form Submit
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Build the scheduled timestamp in UTC
    const localDateStr = `${form.date}T${form.time}:00`;
    const scheduledAt = new Date(localDateStr);
    
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
      // Edit
      console.log(`[Meeting Update]`, { id: selectedMeeting.id, ...payload });
      const { data, error } = await updateMeeting(selectedMeeting.id, payload);
      if (error) {
        alert("Failed to update: " + (error?.message || "Did you run the SQL schema?"));
      } else if (data) {
        setMeetings((prev) => prev.map((m) => (m.id === data.id ? data : m)));
        setSelectedMeeting(null);
      }
    } else {
      // Create
      const createPayload = { ...payload, user_id: user.id };
      console.log(`[Meeting Create]`, createPayload);
      const { data, error } = await createMeeting(createPayload);
      if (error) {
        alert("Failed to save: " + (error?.message || "Did you run the SQL schema?"));
      } else if (data) {
        setMeetings((prev) => [data, ...prev]);
        setSelectedMeeting(null);
      }
    }
    setSaving(false);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Delete this meeting?")) return;
    await deleteMeeting(id);
    setMeetings((prev) => prev.filter((m) => m.id !== id));
    if (selectedMeeting?.id === id) {
      setSelectedMeeting(null);
    }
  };

  const launchMeeting = (url: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    let finalUrl = url;
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      finalUrl = "https://" + url;
    }
    window.open(finalUrl, "_blank", "noopener,noreferrer");
  };

  // Derived state for formatting
  const now = new Date();
  
  const sortedMeetings = useMemo(() => {
    return [...meetings].sort(
      (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
    );
  }, [meetings]);

  const upcomingMeetings = sortedMeetings.filter((m) => new Date(m.scheduled_at).getTime() >= now.getTime() - 60000 * 30); // keep in upcoming for 30m after start
  // Actually, standard behavior: past if it's strictly in the past (maybe > 1 hour past)
  // Let's say it moves to past if it's older than 1 hour.
  const pastMeetings = sortedMeetings.filter((m) => new Date(m.scheduled_at).getTime() < now.getTime() - 60000 * 30).reverse();

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

  return (
    <div className="h-[calc(100vh-theme(spacing.16))] flex flex-col xl:flex-row gap-6 relative">
      
      {/* Toast Overlay */}
      <div className="absolute top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-md shadow-xl text-sm font-medium border flex items-center gap-3 animate-in fade-in slide-in-from-top-2 pointer-events-auto ${
              t.type === "urgent" 
                ? "bg-rose-900/90 border-rose-700 text-rose-100" 
                : "bg-surface/90 border-slate-700 text-slate-100 backdrop-blur"
            }`}
          >
            <span>{t.type === "urgent" ? "🚨" : "🔔"}</span>
            {t.message}
          </div>
        ))}
      </div>

      {/* ── LEFT / MAIN PANEL: List ── */}
      <div className="flex-1 flex flex-col gap-4 min-h-0 overflow-y-auto pr-2 pb-8 custom-scrollbar">
        <div className="flex items-center justify-between pointer-events-none mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">📅</span>
            <h2 className="text-lg font-bold text-slate-100 uppercase tracking-widest">Meetings</h2>
          </div>
          <button 
            className="btn-primary text-sm px-4 py-2 pointer-events-auto xl:hidden"
            onClick={() => setSelectedMeeting(null)}
          >
            + Schedule
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center p-12"><InlineSpinner /></div>
        ) : (
          <>
            {/* Upcoming Section */}
            <div>
              <h3 className="text-slate-400 font-semibold mb-3 sticky top-0 bg-background/95 backdrop-blur py-2 z-10">
                Upcoming Meetings
              </h3>
              {upcomingMeetings.length === 0 ? (
                <div className="glass-panel p-8 text-center text-slate-500 border-dashed">
                  No upcoming meetings scheduled.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {upcomingMeetings.map((m) => {
                    const mDate = new Date(m.scheduled_at);
                    const diffMins = Math.round((mDate.getTime() - now.getTime()) / 60000);
                    const isSoon = diffMins >= 0 && diffMins <= 30;
                    
                    return (
                      <div
                        key={m.id}
                        onClick={() => setSelectedMeeting(m)}
                        className={`glass-panel p-4 flex flex-col sm:flex-row sm:items-center gap-4 cursor-pointer transition hover:border-slate-500 ${
                          selectedMeeting?.id === m.id ? "border-primary shadow-[0_0_15px_rgba(56,189,248,0.15)]" : ""
                        }`}
                      >
                        <div className="flex-1 flex flex-col min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${platformColor(m.platform)}`}>
                              {m.platform}
                            </span>
                            {isSoon && (
                              <span className="text-[10px] bg-red-500/20 text-red-400 font-bold px-2 py-0.5 rounded animate-pulse">
                                SOON
                              </span>
                            )}
                          </div>
                          <h4 className="text-slate-100 font-bold truncate text-lg" title={m.title}>{m.title}</h4>
                          <p className="text-sm text-slate-400">
                            {mDate.toLocaleDateString()} at {mDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>

                        <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end">
                          <div className="text-right">
                            <span className="text-sm font-medium text-slate-300 bg-slate-800/50 px-3 py-1.5 rounded-md inline-block">
                              {getCountdownText(m.scheduled_at)}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => handleDelete(m.id, e)}
                              className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition"
                              title="Delete"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                            <button
                              onClick={(e) => launchMeeting(m.meeting_url, e)}
                              className="btn-primary"
                            >
                              Join Now ↗
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Past Section */}
            <div className="mt-8">
              <h3 className="text-slate-400 font-semibold mb-3 sticky top-0 bg-background/95 backdrop-blur py-2 z-10">
                Past Meetings
              </h3>
              {pastMeetings.length === 0 ? (
                <div className="text-sm text-slate-500 italic pl-2">No past meetings.</div>
              ) : (
                <div className="flex flex-col gap-2 opacity-60 hover:opacity-100 transition duration-300">
                  {pastMeetings.map((m) => {
                    const mDate = new Date(m.scheduled_at);
                    return (
                      <div
                        key={m.id}
                        onClick={() => setSelectedMeeting(m)}
                        className={`bg-surface border border-slate-800 p-3 rounded-lg flex items-center justify-between cursor-pointer hover:bg-slate-800/50 transition ${
                          selectedMeeting?.id === m.id ? "border-primary/50" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3 w-full">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shrink-0 ${platformColor(m.platform)}`}>
                            {m.platform}
                          </span>
                          <span className="text-slate-300 font-medium truncate flex-1">{m.title}</span>
                          <span className="text-xs text-slate-500 tabular-nums shrink-0">
                            {mDate.toLocaleDateString()} {mDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── RIGHT PANEL: Edit / Create Form ── */}
      <div className="xl:w-96 flex flex-col shrink-0">
        <div className="glass-panel flex-1 flex flex-col p-5 sticky top-0">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
            <h2 className="text-lg font-bold text-slate-200">
              {selectedMeeting ? "Edit Meeting" : "Schedule New"}
            </h2>
            {selectedMeeting && (
              <button
                type="button"
                onClick={() => setSelectedMeeting(null)}
                className="text-primary text-sm hover:underline"
              >
                + New
              </button>
            )}
          </div>

          <form onSubmit={handleSave} className="flex flex-col gap-4 flex-1 overflow-y-auto pr-1">
            <label className="block space-y-1">
              <span className="text-sm text-slate-400">Meeting Title <span className="text-rose-500">*</span></span>
              <input
                className="w-full bg-surface border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="E.g. Daily Standup"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-sm text-slate-400">Date <span className="text-rose-500">*</span></span>
                <input
                  type="date"
                  className="w-full bg-surface border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm text-slate-400">Time (Local) <span className="text-rose-500">*</span></span>
                <input
                  type="time"
                  className="w-full bg-surface border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                />
              </label>
            </div>

            <label className="block space-y-1">
              <span className="text-sm text-slate-400">Platform</span>
              <select
                className="w-full bg-surface border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary appearance-none"
                value={form.platform}
                onChange={(e) => setForm({ ...form, platform: e.target.value })}
              >
                <option value="Zoom">Zoom</option>
                <option value="Google Meet">Google Meet</option>
                <option value="Teams">Microsoft Teams</option>
                <option value="Custom">Other / Custom</option>
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-sm text-slate-400">Meeting URL <span className="text-rose-500">*</span></span>
              <input
                className="w-full bg-surface border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary font-mono text-xs"
                placeholder="https://zoom.us/j/..."
                required
                value={form.meeting_url}
                onChange={(e) => setForm({ ...form, meeting_url: e.target.value })}
              />
            </label>

            <label className="block space-y-1 flex-1">
              <span className="text-sm text-slate-400">Description / Passcode</span>
              <textarea
                className="w-full h-24 bg-surface border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                placeholder="Optional details, agenda, or passcodes..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>

            <div className="pt-4 border-t border-slate-800 mt-auto">
              <button
                type="submit"
                disabled={saving || !form.title || !form.meeting_url || !form.date || !form.time}
                className="btn-primary w-full py-2.5 flex items-center justify-center gap-2 text-sm font-semibold"
              >
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
