import { useEffect, useState, useRef } from "react";
import useAppStore from "../store/useAppStore";
import { supabase } from "../api/supabaseClient";
import {
  updateProfile,
  updateSettings,
  clearLogs,
} from "../api/settingsApi";
import InlineSpinner from "../components/InlineSpinner";
import { useLocation, useNavigate } from "react-router-dom";

const SettingsPage = () => {
  const user = useAppStore((s) => s.user);
  
  // App store states
  const appSettings = useAppStore((s) => s.appSettings);
  const userProfile = useAppStore((s) => s.userProfile);
  const appLogs = useAppStore((s) => s.appLogs);
  const setAppSettings = useAppStore((s) => s.setAppSettings);
  const setUserProfile = useAppStore((s) => s.setUserProfile);
  const setAppLogs = useAppStore((s) => s.setAppLogs);

  const location = useLocation();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<"general" | "profile" | "logs" | "ai">("general");
  const [loadingProfile, setLoadingProfile] = useState(false);
  
  // AI Keys state
  const [apiKeys, setApiKeys] = useState<any[]>([]);

  // Logs filters
  const [logStatusFilter, setLogStatusFilter] = useState<string>("all");
  const [logModuleFilter, setLogModuleFilter] = useState<string>("all");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize tabs and keys
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    if (tab && ["general", "profile", "logs", "ai"].includes(tab)) {
      setActiveTab(tab as any);
    }
  }, [location]);

  useEffect(() => {
    if (!user) return;
    const fetchApiKeys = async () => {
      const { data } = await supabase.from("api_key_items").select("*").eq("user_id", user.id);
      if (data) setApiKeys(data);
    };
    fetchApiKeys();
  }, [user]);

  // Realtime Logs Subscription
  useEffect(() => {
    if (!user) return;
    
    // Initial fetch of logs if empty
    if (appLogs.length === 0) {
      supabase.from("app_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100)
        .then((res: any) => {
          if (res.data) setAppLogs(res.data);
        });
    }

    // Subscribe to new logs
    const channel = supabase
      .channel("my-logs")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "app_logs", filter: `user_id=eq.${user.id}` },
        (payload: any) => {
          setAppLogs([payload.new as any, ...useAppStore.getState().appLogs].slice(0, 100));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, setAppLogs]); // Only run once on mount per user

  // --- Input Handlers (Immediate reflection) ---
  
  const handleSettingToggle = async (key: string, value: any) => {
    if (!user || !appSettings) return;
    
    // Optimistic update
    const newSettings = { ...appSettings, [key]: value };
    setAppSettings(newSettings);
    
    const { error } = await updateSettings(user.id, { [key]: value });
    if (error) {
      alert(`Error updating ${key}: ` + error.message);
    }
  };

  const handleProfileNameChange = async (e: React.FocusEvent<HTMLInputElement>) => {
    if (!user || !userProfile) return;
    const val = e.target.value.trim();
    if (val !== userProfile.display_name) {
      setLoadingProfile(true);
      const { data } = await updateProfile(user.id, { display_name: val });
      if (data) setUserProfile(data);
      setLoadingProfile(false);
    }
  };

  // Avatar Image Upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user || !userProfile) return;
    const file = e.target.files[0];
    
    // Validate image
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file.");
      return;
    }

    setLoadingProfile(true);
    const filePath = `${user.id}/profile.jpg`;

    // Upload / upsert
    const { error: uploadError } = await supabase.storage
      .from("Profile_image")
      .upload(filePath, file, { cacheControl: "3600", upsert: true });

    if (uploadError) {
      alert("Error uploading image: " + uploadError.message);
      setLoadingProfile(false);
      return;
    }

    // Get public URL
    const { data: publicData } = supabase.storage
      .from("Profile_image")
      .getPublicUrl(filePath);

    // Add a random query param to bust local browser caching
    // so the new image renders instantly
    const cacheBusterUrl = `${publicData.publicUrl}?t=${Date.now()}`;

    // Update DB & store
    const { data } = await updateProfile(user.id, { avatar_url: cacheBusterUrl });
    if (data) setUserProfile(data);
    setLoadingProfile(false);
  };

  // --- Actions ---

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // Re-directing strictly out
    window.location.href = "/login";
  };

  const handleClearLogs = async () => {
    if (!user) return;
    if (!window.confirm("Are you sure you want to clear all logs?")) return;
    await clearLogs(user.id);
    setAppLogs([]);
  };

  const handleExportLogs = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appLogs, null, 2));
    const dlAnchorElem = document.createElement("a");
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", "nodlync_logs.json");
    dlAnchorElem.click();
  };

  // UI state for logs
  const filteredLogs = appLogs.filter((log) => {
    if (logStatusFilter !== "all" && log.status !== logStatusFilter) return false;
    if (logModuleFilter !== "all" && log.action !== logModuleFilter) return false;
    return true;
  });

  const uniqueModules = Array.from(new Set(appLogs.map((l) => l.action || "")));

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 h-full flex flex-col">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-100 uppercase tracking-widest mb-2">Settings Hub</h1>
        <p className="text-slate-400">Manage your profile, application preferences, and view system logs in one place.</p>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 mb-6 border-b border-slate-800">
        {[
          { id: "general", label: "General" },
          { id: "profile", label: "Profile" },
          { id: "logs", label: "System Logs" },
          { id: "ai", label: "AI Configuration" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as any);
              navigate(`/settings?tab=${tab.id}`, { replace: true });
            }}
            className={`px-6 py-3 font-medium text-sm transition border-b-2 ${
              activeTab === tab.id
                ? "text-primary border-primary bg-primary/5"
                : "text-slate-400 border-transparent hover:text-slate-300 hover:bg-slate-800/50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto pb-12 custom-scrollbar">
        
        {/* ===================== GENERAL TAB ===================== */}
        {activeTab === "general" && (
          !appSettings ? (
            <div className="glass-panel p-6 bg-rose-500/10 border-rose-500/30 text-rose-300">
              <h3 className="font-bold mb-2">Failed to load App Settings</h3>
              <p className="text-sm">We couldn't fetch your global application preferences. This typically indicates the `app_settings` table was not successfully created or RLS policies are blocking access. Please run the `supabase_settings_schema.sql` file in your Supabase SQL editor.</p>
            </div>
          ) : (
            <div className="glass-panel p-6 space-y-6 max-w-2xl animate-in fade-in">
              <h2 className="text-lg font-bold text-slate-200 border-b border-slate-800 pb-2">Appearance & Behavior</h2>
              
              <div className="space-y-4">
                <label className="flex items-center justify-between p-3 bg-surface border border-slate-700 rounded-lg cursor-pointer hover:border-slate-500 transition">
                  <div>
                    <span className="block text-sm font-semibold text-slate-200">Dark Theme</span>
                    <span className="text-xs text-slate-400">Use dark mode across the application.</span>
                  </div>
                  <input
                    type="checkbox"
                    className="w-5 h-5 accent-primary"
                    checked={appSettings.theme === "dark"}
                    onChange={(e) => handleSettingToggle("theme", e.target.checked ? "dark" : "light")}
                  />
                </label>
  
                <label className="flex items-center justify-between p-3 bg-surface border border-slate-700 rounded-lg cursor-pointer hover:border-slate-500 transition">
                  <div>
                    <span className="block text-sm font-semibold text-slate-200">Default Project View</span>
                    <span className="text-xs text-slate-400">Load projects as lists or grids by default.</span>
                  </div>
                  <select
                    className="bg-slate-800 border-none text-sm text-slate-200 p-1.5 outline-none rounded"
                    value={appSettings.default_project_view || "list"}
                    onChange={(e) => handleSettingToggle("default_project_view", e.target.value)}
                  >
                    <option value="list">List View</option>
                    <option value="grid">Grid View</option>
                  </select>
                </label>
  
                <label className="flex items-center justify-between p-3 bg-surface border border-slate-700 rounded-lg cursor-pointer hover:border-slate-500 transition">
                  <div>
                    <span className="block text-sm font-semibold text-slate-200">Push Notifications</span>
                    <span className="text-xs text-slate-400">Receive in-app alerts and browser notifications.</span>
                  </div>
                  <input
                    type="checkbox"
                    className="w-5 h-5 accent-primary"
                    checked={appSettings.notifications_enabled}
                    onChange={(e) => handleSettingToggle("notifications_enabled", e.target.checked)}
                  />
                </label>
  
                <label className="flex items-center justify-between p-3 bg-surface border border-slate-700 rounded-lg cursor-pointer hover:border-slate-500 transition">
                  <div>
                    <span className="block text-sm font-semibold text-slate-200">Auto Updates</span>
                    <span className="text-xs text-slate-400">Automatically update local caches in the background.</span>
                  </div>
                  <input
                    type="checkbox"
                    className="w-5 h-5 accent-primary"
                    checked={appSettings.auto_update_enabled}
                    onChange={(e) => handleSettingToggle("auto_update_enabled", e.target.checked)}
                  />
                </label>
              </div>
            </div>
          )
        )}

        {/* ===================== PROFILE TAB ===================== */}
        {activeTab === "profile" && userProfile && (
          <div className="glass-panel p-6 space-y-8 max-w-2xl animate-in fade-in">
            <h2 className="text-lg font-bold text-slate-200 border-b border-slate-800 pb-2">User Profile</h2>
            
            {/* Avatar Section */}
            <div className="flex items-center gap-6">
              <div 
                className="w-24 h-24 rounded-full bg-surface border-2 border-slate-700 overflow-hidden flex items-center justify-center relative group cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                {loadingProfile ? (
                  <InlineSpinner />
                ) : userProfile.avatar_url ? (
                  <img src={userProfile.avatar_url} alt="Profile" className="w-full h-full object-cover group-hover:opacity-50 transition" />
                ) : (
                  <span className="text-primary font-bold text-3xl">{userProfile.display_name?.charAt(0) || "U"}</span>
                )}
                
                {!loadingProfile && (
                  <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition">
                    <span className="text-xs font-semibold text-white">Upload</span>
                  </div>
                )}
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                accept="image/*" 
                className="hidden" 
                onChange={handleImageUpload} 
              />
              <div>
                <button onClick={() => fileInputRef.current?.click()} className="btn-ghost text-sm text-primary mb-1">
                  Change Photo
                </button>
                <p className="text-xs text-slate-500">JPG, GIF or PNG. 1MB max.</p>
              </div>
            </div>

            <div className="space-y-5">
              <label className="block space-y-1">
                <span className="text-sm text-slate-400 font-medium">Display Name</span>
                <input
                  type="text"
                  className="w-full bg-surface border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary"
                  defaultValue={userProfile.display_name}
                  onBlur={handleProfileNameChange}
                  placeholder="Your name"
                />
                <p className="text-xs text-slate-500 mt-1">Saves automatically when you click off the field.</p>
              </label>

              <label className="block space-y-1">
                <span className="text-sm text-slate-400 font-medium">Email Address (Read-only)</span>
                <input
                  type="email"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-500 cursor-not-allowed"
                  value={user?.email || ""}
                  disabled
                />
              </label>
            </div>

            <div className="pt-6 border-t border-slate-800">
              <button type="button" onClick={handleLogout} className="btn-ghost text-rose-400 hover:bg-rose-500/10 w-full flex items-center justify-center gap-2 font-bold py-3">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Securely Log Out
              </button>
            </div>
          </div>
        )}

        {/* ===================== LOGS TAB ===================== */}
        {activeTab === "logs" && (
          <div className="glass-panel flex flex-col min-h-[500px] animate-in fade-in">
            <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 sticky top-0 bg-background/95 backdrop-blur z-10">
              <div className="flex items-center gap-3">
                <select
                  value={logStatusFilter}
                  onChange={(e) => setLogStatusFilter(e.target.value)}
                  className="bg-surface border border-slate-700 text-slate-200 text-sm rounded px-3 py-1.5 focus:outline-none focus:border-primary"
                >
                  <option value="all">All Statuses</option>
                  <option value="success">Success</option>
                  <option value="error">Error</option>
                  <option value="info">Info</option>
                </select>

                <select
                  value={logModuleFilter}
                  onChange={(e) => setLogModuleFilter(e.target.value)}
                  className="bg-surface border border-slate-700 text-slate-200 text-sm rounded px-3 py-1.5 focus:outline-none focus:border-primary"
                >
                  <option value="all">All Modules</option>
                  {uniqueModules.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold text-emerald-500 flex items-center gap-1.5 mr-2 tracking-widest bg-emerald-500/10 px-2 py-1 rounded">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                </span>
                <button onClick={handleExportLogs} className="btn-ghost text-xs px-4 py-1.5 font-bold">
                  Export JSON
                </button>
                <button onClick={handleClearLogs} className="btn-ghost text-rose-400 hover:text-rose-300 text-xs px-4 py-1.5 font-bold">
                  Clear All
                </button>
              </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto">
              {filteredLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-16 text-center h-full text-slate-500 italic gap-2">
                  <span className="text-3xl opacity-50">📡</span>
                  <p>Awaiting system activity logs.</p>
                </div>
              ) : (
                <div className="space-y-1.5 flex flex-col-reverse">
                  {/* flex-col-reverse with reversed map so newest is physically at bottom but visually flows nicely, or just regular if ordered from supabase */}
                  {filteredLogs.map((log) => (
                    <div key={log.id} className="bg-surface border border-slate-800/80 rounded py-2.5 px-3 flex flex-col sm:flex-row sm:items-center gap-3 font-mono text-[11px] align-top">
                      <div className="w-32 shrink-0 text-slate-500 truncate" title={new Date(log.created_at).toLocaleString()}>
                        {new Date(log.created_at).toLocaleTimeString()} - {new Date(log.created_at).toLocaleDateString()}
                      </div>
                      <div className="w-20 shrink-0">
                        <span className={`px-2 py-0.5 rounded font-bold ${
                          log.status === "error" ? "bg-rose-500/20 text-rose-400" :
                          log.status === "success" ? "bg-emerald-500/20 text-emerald-400" :
                          "bg-blue-500/20 text-blue-400"
                        }`}>
                          {log.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="w-36 shrink-0 font-bold text-slate-300">[{log.action}]</div>
                      <div className="flex-1 text-slate-300 leading-relaxed max-w-full overflow-hidden text-ellipsis">
                        {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================== AI CONFIG TAB ===================== */}
        {activeTab === "ai" && (
          !appSettings ? (
            <div className="glass-panel p-6 bg-rose-500/10 border-rose-500/30 text-rose-300">
              <h3 className="font-bold mb-2">Failed to load App Settings</h3>
              <p className="text-sm">We couldn't fetch your global application preferences required for AI binding. Please execute your `supabase_settings_schema.sql`.</p>
            </div>
          ) : (
            <div className="glass-panel p-6 space-y-6 max-w-2xl animate-in fade-in">
              <h2 className="text-lg font-bold text-slate-200 border-b border-slate-800 pb-2">Global AI Configuration</h2>
              
              <div className="bg-primary/10 border border-primary/20 text-blue-200 p-4 rounded-lg text-sm flex gap-3">
                <span className="text-lg">🤖</span>
                <p>Bind your exact API usage from your Vault universally across the app right here. Selecting a default provider pipes logic seamlessly into AI Playground, workflows, and intelligent project suggestions.</p>
              </div>
  
              <div className="space-y-4 pt-2">
                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-slate-200">Active Global AI Engine</span>
                  <select
                    value={appSettings.default_ai_provider || ""}
                    onChange={(e) => handleSettingToggle("default_ai_provider", e.target.value)}
                    className="w-full bg-surface border border-slate-700 rounded-lg px-3 py-3 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
                  >
                    {apiKeys.length === 0 ? (
                      <option value="" disabled>No APIs configured</option>
                    ) : (
                      <>
                        <option value="" disabled>Select an API...</option>
                        {apiKeys.map((keyObj: any) => (
                          <option key={keyObj.id} value={keyObj.id}>
                            {keyObj.provider} - {keyObj.key_name}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </label>
  
                <div className="pt-4">
                  <h3 className="text-sm font-semibold text-slate-300 mb-3">Loaded Provider Keys</h3>
                  {apiKeys.length === 0 ? (
                    <div className="border border-dashed border-slate-700 p-4 rounded text-center text-sm text-slate-500">
                      No keys found in your API Vault.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {apiKeys.map((k: any) => (
                        <div key={k.id} className="flex items-center justify-between p-3 bg-surface border border-slate-800 rounded">
                          <span className="text-sm font-medium text-slate-200">{k.provider}</span>
                          <span className="text-xs font-mono text-slate-500">{k.key_name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <button onClick={() => navigate("/api-vault")} className="mt-4 text-sm text-primary hover:underline font-medium">
                    → Manage keys in API Vault
                  </button>
                </div>
              </div>
            </div>
          )
        )}

      </div>
    </div>
  );
};

export default SettingsPage;
