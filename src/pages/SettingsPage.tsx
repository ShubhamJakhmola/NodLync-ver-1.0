import { useEffect, useState, useRef } from "react";
import useAppStore from "../store/useAppStore";
import { supabase } from "../api/supabaseClient";
import {
  updateProfile,
  updateSettings,
} from "../api/settingsApi";
import { logAppEvent } from "../utils/appLogger";
import SystemLogsPanel from "../components/SystemLogsPanel";
import { useLocation, useNavigate, Link } from "react-router-dom";
import ModuleHeader from "../components/ModuleHeader";
import { usePagination } from "../hooks/usePagination";
import PaginationControls from "../components/PaginationControls";

const SettingsPage = () => {
  const user = useAppStore((s) => s.user);

  // App store states
  const appSettings = useAppStore((s) => s.appSettings);
  const userProfile = useAppStore((s) => s.userProfile);
  const setAppSettings = useAppStore((s) => s.setAppSettings);
  const setUserProfile = useAppStore((s) => s.setUserProfile);

  const location = useLocation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"general" | "profile" | "integrations" | "logs" | "ai" | "about">("general");
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Log when users access the System Logs tab
  useEffect(() => {
    if (activeTab === "logs" && user) {
      void logAppEvent({
        type: "info",
        module: "settings",
        message: "Viewed system logs",
      });
    }
  }, [activeTab, user]);
  const [savingSettingKey, setSavingSettingKey] = useState<string | null>(null);

  // AI Keys state
  const [apiKeys, setApiKeys] = useState<any[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize tabs and keys
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    if (tab && ["general", "profile", "integrations", "logs", "ai", "about"].includes(tab)) {
      setActiveTab(tab as any);
    }
  }, [location, navigate]);

  useEffect(() => {
    if (!user) return;
    const fetchApiKeys = async () => {
      setLoadingKeys(true);
      try {
        const { data } = await supabase.from("api_keys").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
        if (data) setApiKeys(data);
      } catch (e) {
        console.error("Failed to load keys", e);
      } finally {
        setLoadingKeys(false);
      }
    };
    void fetchApiKeys();
  }, [user]);

  // --- Handlers ---
  const handleSettingChange = async (key: string, value: unknown) => {
    if (!user) return;
    const previous = appSettings;
    const updatedSettings = { 
      ...appSettings, 
      [key]: value,
      user_id: user.id, // Ensure user_id is always a string
      theme: (appSettings?.theme) || "light", // Ensure theme is always a string
      default_ai_provider: (appSettings?.default_ai_provider) || "openai", // Ensure default_ai_provider is always a string
      notifications_enabled: (appSettings?.notifications_enabled) ?? false, // Ensure notifications_enabled is always a boolean
      auto_update_enabled: (appSettings?.auto_update_enabled) ?? false, // Ensure auto_update_enabled is always a boolean
    };
    setAppSettings(updatedSettings);
    setSavingSettingKey(key);
    try {
      const { error } = await updateSettings(user.id, { [key]: value });
      if (error) {
        setAppSettings(previous);
        await logAppEvent({
          type: "error",
          module: "settings",
          message: `Failed to update setting ${key}: ${error.message}`,
        });
      } else {
        await logAppEvent({
          type: "success",
          module: "settings",
          message: `Updated setting ${key}`,
          meta: { key, value },
        });
      }
    } catch (err) {
      setAppSettings(previous);
      await logAppEvent({
        type: "error",
        module: "settings",
        message: `Failed to update setting ${key}: ${err}`,
      });
    } finally {
      setSavingSettingKey(null);
    }
  };

  const handleSettingToggle = async (key: string, value: string | boolean) => {
    await handleSettingChange(key, value);
  };

  const handleProfileNameChange = async (e: React.FocusEvent<HTMLInputElement>) => {
    if (!user || !userProfile) return;
    const val = e.target.value.trim();
    if (val !== userProfile.display_name) {
      setLoadingProfile(true);
      try {
        const { data } = await updateProfile(user.id, { display_name: val });
        if (data) {
          setUserProfile(data);
          await logAppEvent({
            type: "success",
            module: "profile",
            message: "Updated display name",
            meta: { oldName: userProfile.display_name, newName: val },
          });
        }
      } catch (error) {
        await logAppEvent({
          type: "error",
          module: "profile",
          message: "Failed to update display name",
          meta: { error, newName: val },
        });
      } finally {
        setLoadingProfile(false);
      }
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !user) return;
    setLoadingProfile(true);
    try {
      const file = e.target.files[0];
      const filePath = `${user.id}/profile.jpg`;
      await supabase.storage.from("Profile_image").upload(filePath, file, { upsert: true });
      const { data: publicData } = supabase.storage.from("Profile_image").getPublicUrl(filePath);
      const { data } = await updateProfile(user.id, { avatar_url: `${publicData.publicUrl}?t=${Date.now()}` });
      if (data) {
        setUserProfile(data);
        await logAppEvent({
          type: "success",
          module: "profile",
          message: "Updated profile picture",
          meta: { fileSize: file.size, fileName: file.name },
        });
      }
    } catch (error) {
      await logAppEvent({
        type: "error",
        module: "profile",
        message: "Failed to update profile picture",
        meta: { error },
      });
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await supabase.auth.signOut();
    navigate("/login");
  };

  // Pagination for API keys
  const apiKeysPagination = usePagination(apiKeys);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 h-full flex flex-col">
      <ModuleHeader title="Settings Hub" description="MANAGE YOUR PROFILE AND SYSTEM LOGS" icon="⚙️" />

      <div className="flex items-center gap-1 mb-6 border-b border-stroke overflow-x-auto custom-scrollbar">
        {["general", "profile", "integrations", "logs", "ai", "about"].map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab as any); navigate(`/settings?tab=${tab}`, { replace: true }); }}
            className={`px-6 py-3 font-medium text-sm transition border-b-2 capitalize whitespace-nowrap ${activeTab === tab ? "text-primary border-primary bg-primary/5" : "text-fg-muted border-transparent hover:text-fg-secondary hover:bg-surface/50"}`}
          >
            {tab === "ai" ? "AI Configuration" : tab === "logs" ? "System Logs" : tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto pb-12 custom-scrollbar">
        {activeTab === "general" && appSettings && (
          <div className="glass-panel p-6 space-y-6 max-w-2xl animate-in fade-in">
            <h2 className="text-lg font-bold text-fg-secondary border-b pb-2">Appearance & Behavior</h2>
            <div className="space-y-4">
              {[
                { label: "Dark Theme", key: "theme", checked: appSettings.theme === "dark", toggle: (v: boolean) => handleSettingToggle("theme", v ? "dark" : "light") },
                { label: "Push Notifications", key: "notifications_enabled", checked: appSettings.notifications_enabled, toggle: (v: boolean) => handleSettingToggle("notifications_enabled", v) },
                { label: "Auto Updates", key: "auto_update_enabled", checked: appSettings.auto_update_enabled, toggle: (v: boolean) => handleSettingToggle("auto_update_enabled", v) },
              ].map(item => (
                <label key={item.key} className="flex items-center justify-between p-3 bg-surface border border-stroke rounded-lg cursor-pointer">
                  <span className="text-sm font-semibold">{item.label}</span>
                  <input type="checkbox" className="w-5 h-5 accent-primary" checked={item.checked} onChange={(e) => item.toggle(e.target.checked)} disabled={savingSettingKey === item.key} />
                </label>
              ))}
            </div>
          </div>
        )}

        {activeTab === "profile" && userProfile && (
          <div className="glass-panel p-6 space-y-8 max-w-2xl animate-in fade-in">
            <h2 className="text-lg font-bold text-fg-secondary border-b pb-2">User Profile</h2>
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-full bg-surface border-2 border-stroke overflow-hidden flex items-center justify-center relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                {userProfile.avatar_url ? <img src={userProfile.avatar_url} className="w-full h-full object-cover" /> : <span className="text-primary text-3xl font-bold">{userProfile.display_name?.charAt(0)}</span>}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition"><span className="text-xs text-white">Upload</span></div>
              </div>
              <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleImageUpload} />
              <button onClick={handleLogout} disabled={loggingOut} className="btn-ghost text-rose-400 font-bold px-6">{loggingOut ? "..." : "Logout"}</button>
            </div>
            <div className="space-y-4">
              <label className="block space-y-1">
                <span className="text-sm text-fg-muted font-medium">Display Name</span>
                <input type="text" className="w-full bg-surface border border-stroke rounded-lg px-4 py-2.5 text-sm" defaultValue={userProfile.display_name} onBlur={handleProfileNameChange} disabled={loadingProfile} />
              </label>
            </div>
          </div>
        )}

        {activeTab === "integrations" && (
          <div className="glass-panel p-6 space-y-6 max-w-2xl animate-in fade-in">
            <h2 className="text-lg font-bold text-fg-secondary border-b pb-2">Browser Integrations</h2>
            <div className="flex flex-col md:flex-row gap-6 p-6 bg-surface border border-stroke rounded-xl items-center">
              <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 shrink-0">
                 <span className="text-3xl">🔌</span>
              </div>
              <div className="flex-1 space-y-2 text-center md:text-left">
                <h3 className="text-base font-bold text-fg-secondary">NodLync Chrome Extension</h3>
                <p className="text-sm text-fg-muted italic">Capture API requests directly from your browser and import them into the AI Tester with one click.</p>
                <div className="flex flex-wrap gap-2 pt-2 justify-center md:justify-start">
                     <a href="/NodLync-Extension.zip" download className="btn-primary px-5 py-2 text-xs font-bold">Download (.zip)</a>
                     <Link to="/docs/extension" className="btn-ghost px-5 py-2 text-xs font-bold">Learn More</Link>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-fg-muted uppercase tracking-widest">Quick Installation</h4>
              <ol className="text-sm text-fg-secondary space-y-3 list-decimal list-inside ml-2">
                <li className="pl-2">Download and extract the <span className="text-primary font-bold">NodLync-Extension.zip</span> file.</li>
                <li className="pl-2">Open <span className="font-mono text-xs bg-panel px-1.5 py-0.5 rounded">chrome://extensions</span> in your browser.</li>
                <li className="pl-2">Enable <span className="font-bold underline">Developer Mode</span> (top right).</li>
                <li className="pl-2">Click <span className="font-bold">Load Unpacked</span> and select the extracted folder.</li>
              </ol>
            </div>
          </div>
        )}

        {activeTab === "logs" && (
          <SystemLogsPanel userId={user?.id} />
        )}

        {activeTab === "ai" && appSettings && (
          <div className="glass-panel p-6 space-y-6 max-w-2xl animate-in fade-in">
            <h2 className="text-lg font-bold text-fg-secondary border-b pb-2">Global AI Configuration</h2>
            <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg text-sm text-blue-200">Bind your API usage from your Vault universally.</div>
            <label className="block space-y-2">
              <span className="text-sm font-semibold">Active Global AI Engine</span>
              <select value={appSettings.default_ai_provider || ""} onChange={(e) => handleSettingToggle("default_ai_provider", e.target.value)} className="w-full bg-surface border border-stroke rounded-lg px-3 py-3 text-sm focus:ring-1 focus:ring-primary appearance-none" disabled={loadingKeys}>
                <option value="">{loadingKeys ? "Loading APIs..." : "Select an API..."}</option>
                {apiKeys.map((key: any) => <option key={key.id} value={key.id}>{key.provider} - {key.name}</option>)}
              </select>
            </label>
            {apiKeys.length > 0 && (
              <PaginationControls
                {...apiKeysPagination}
                onPageChange={apiKeysPagination.setCurrentPage}
                onPageSizeChange={apiKeysPagination.setPageSize}
                itemLabel="keys"
              />
            )}
            <button onClick={() => navigate("/api-vault")} className="text-sm text-primary hover:underline font-medium">→ Manage keys in API Vault</button>
          </div>
        )}

        {activeTab === "about" && (
          <div className="glass-panel p-8 space-y-10 max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-3xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center mb-6 shadow-xl shadow-primary/5">
                <img src="/favicon.svg" alt="NodLync" className="w-16 h-16 object-contain" />
              </div>
              <h2 className="text-3xl font-black text-fg tracking-tight">NodLync</h2>
              <p className="text-xs font-bold text-primary uppercase tracking-[0.25em] mt-2">Versatile AI Ops Workspace</p>
              <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full bg-surface border border-stroke text-[10px] font-mono text-fg-muted">v1.0.0 Stable Build</div>
            </div>
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-fg-muted">The Developers</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { name: "Shubham Jakhmola", role: "", icon: "S", color: "bg-primary/20 text-primary" },
                  { name: "Avtar Singh", role: "", icon: "A", color: "bg-emerald-400/20 text-emerald-400" },
                ].map(dev => (
                  <div key={dev.name} className="flex items-center gap-4 p-4 bg-surface/50 border border-stroke rounded-2xl group hover:border-primary/30 transition-all">
                    <div className="w-12 h-12 rounded-full border-2 border-stroke-strong flex items-center justify-center overflow-hidden">
                      <div className={`w-full h-full ${dev.color} flex items-center justify-center font-black`}>{dev.icon}</div>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-fg group-hover:text-primary transition-colors">{dev.name}</h4>
                      <p className="text-[10px] text-fg-muted uppercase font-bold">{dev.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4 pt-4 border-t border-stroke/50">
              <h3 className="text-sm font-bold uppercase tracking-widest text-fg-muted text-center mb-4">Legal & Support</h3>
              <div className="grid grid-cols-2 gap-4">
                <Link to="/privacy" className="p-4 bg-surface/40 border border-stroke rounded-2xl text-center hover:bg-primary/5 hover:border-primary/30 transition-all"><span className="text-sm font-bold text-fg-secondary">Privacy</span></Link>
                <Link to="/terms" className="p-4 bg-surface/40 border border-stroke rounded-2xl text-center hover:bg-primary/5 hover:border-primary/30 transition-all"><span className="text-sm font-bold text-fg-secondary">Terms</span></Link>
              </div>
              <div className="text-center text-[10px] text-fg-muted pt-6">© 2026 NodLync. Built for Intelligent Workflows.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
