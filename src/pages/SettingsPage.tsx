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

  const [activeTab, setActiveTab] = useState<"preferences" | "profile" | "integrations" | "ai" | "danger" | "logs" | "about">("preferences");
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [loadingDanger, setLoadingDanger] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteMessage, setDeleteMessage] = useState<{type: 'error'|'success', text: string} | null>(null);
  
  // Password State
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{type: 'error'|'success', text: string} | null>(null);

  const handleUpdatePassword = async () => {
    if (!oldPassword) {
      setPasswordMsg({ type: "error", text: "Please enter your current password." });
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPasswordMsg({ type: "error", text: "New password must be at least 6 characters long." });
      return;
    }
    if (!user?.email) {
      setPasswordMsg({ type: "error", text: "Could not verify user identity." });
      return;
    }

    setUpdatingPassword(true);
    setPasswordMsg(null);

    // Verify old password first
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: oldPassword,
    });

    if (signInError) {
      setPasswordMsg({ type: "error", text: "Incorrect current password." });
      setUpdatingPassword(false);
      return;
    }

    // Update to new password
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPasswordMsg({ type: "error", text: error.message });
    } else {
      setPasswordMsg({ type: "success", text: "Password updated successfully!" });
      setOldPassword("");
      setNewPassword("");
      setTimeout(() => setShowPasswordForm(false), 2000);
    }
    setUpdatingPassword(false);
  };

  const handleDeleteAccount = async () => {
    setLoadingDanger(true);
    setDeleteMessage(null);
    try {
      const { error } = await supabase.rpc('delete_user_account');
      if (error) {
        setDeleteMessage({ type: 'error', text: `Failed to delete account: ${error.message}. (Ensure the backend RPC 'delete_user_account' is configured).` });
        setLoadingDanger(false);
      } else {
        setDeleteMessage({ type: 'success', text: "Account successfully deleted. Redirecting..." });
        await new Promise(r => setTimeout(r, 1500));
        await supabase.auth.signOut();
        navigate("/login", { replace: true });
      }
    } catch (err: any) {
      setDeleteMessage({ type: 'error', text: `Unexpected error: ${err.message || 'Server error'}` });
      setLoadingDanger(false);
    }
  };

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

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    if (tab && ["preferences", "profile", "integrations", "ai", "danger", "logs", "about"].includes(tab)) {
      setActiveTab(tab as any);
    }
  }, [location.search]);

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
      // Start with defaults or current values
      user_id: user.id,
      theme: (appSettings?.theme) || "light",
      default_ai_provider: (appSettings?.default_ai_provider) || "openai",
      notifications_enabled: (appSettings?.notifications_enabled) ?? false,
      auto_update_enabled: (appSettings?.auto_update_enabled) ?? false,
      // Layer current state
      ...appSettings,
      // Apply the new change last to ensure it wins
      [key]: value,
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

      <div className="flex items-center gap-1 mb-6 border-b border-stroke overflow-x-auto custom-scrollbar pb-2">
        {["preferences", "profile", "integrations", "ai", "logs", "danger"].map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => {
              setActiveTab(tab as any);
              navigate(
                { pathname: location.pathname, search: `?tab=${tab}` },
                { replace: true }
              );
            }}
            className={`px-4 py-2 font-medium text-sm transition rounded-lg capitalize whitespace-nowrap ${
              activeTab === tab 
                ? tab === "danger" ? "bg-rose-500/10 text-rose-500 font-bold" : "text-primary bg-primary/10 font-bold"
                : tab === "danger" ? "text-rose-400 hover:bg-rose-500/5" : "text-fg-muted hover:text-fg-secondary hover:bg-surface/50"
            }`}
          >
            {tab === "ai" ? "AI Config" : tab === "danger" ? "Danger Zone" : tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto pb-12 custom-scrollbar">
        {activeTab === "preferences" && appSettings && (
          <div className="glass-panel p-6 space-y-6 max-w-2xl animate-in fade-in">
            <h2 className="text-lg font-bold text-fg-secondary border-b pb-2">Appearance & Behavior</h2>
            <div className="space-y-4">
              {[
                { label: "Dark Theme", key: "theme", checked: appSettings.theme === "dark", toggle: (v: boolean) => handleSettingToggle("theme", v ? "dark" : "light") },
                { label: "Push Notifications", key: "notifications_enabled", checked: appSettings.notifications_enabled, toggle: (v: boolean) => handleSettingToggle("notifications_enabled", v) },
                { label: "Auto Updates", key: "auto_update_enabled", checked: appSettings.auto_update_enabled, toggle: (v: boolean) => handleSettingToggle("auto_update_enabled", v) },
              ].map(item => (
                <label key={item.key} className="flex items-center justify-between p-3 bg-surface border border-stroke rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                  <span className="text-sm font-semibold">{item.label}</span>
                  <input type="checkbox" className="w-5 h-5 accent-primary cursor-pointer" checked={item.checked} onChange={(e) => item.toggle(e.target.checked)} disabled={savingSettingKey === item.key} />
                </label>
              ))}
            </div>

            <div className="pt-4 border-t border-stroke mt-6 space-y-4">
              <h2 className="text-lg font-bold text-fg-secondary pb-2">Resources & Help</h2>
              <div className="flex items-center justify-between p-4 bg-surface border border-stroke rounded-lg hover:border-primary/50 transition-colors">
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-2">📚 NodLync Documentation</h3>
                  <p className="text-xs text-fg-muted mt-1">Comprehensive guide, step-by-step module tutorials, and platform data references.</p>
                </div>
                <Link to="/docs" className="btn-primary px-5 py-2 text-xs font-bold whitespace-nowrap shadow-md hover:-translate-y-0.5 transition-all">Open Docs ↗</Link>
              </div>
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
              <label className="block space-y-1">
                <span className="text-sm text-fg-muted font-medium">Registered Email (Read-only)</span>
                <input type="email" className="w-full bg-surface/50 border border-stroke rounded-lg px-4 py-2.5 text-sm text-fg-muted cursor-not-allowed" value={user?.email || ""} disabled />
              </label>
              <div className="pt-4 border-t border-stroke space-y-4">
                <h3 className="text-sm font-bold text-fg">Account & Security</h3>
                <div className="p-4 bg-surface border border-stroke rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold">Change Password</p>
                      <p className="text-xs text-fg-muted mt-1">Requires re-authentication for security.</p>
                    </div>
                    <button onClick={() => setShowPasswordForm(!showPasswordForm)} className="btn-secondary px-4 py-2 text-xs">
                      {showPasswordForm ? "Cancel" : "Update Password"}
                    </button>
                  </div>
                  {showPasswordForm && (
                    <div className="mt-4 pt-4 border-t border-stroke animate-in fade-in slide-in-from-top-2 space-y-4">
                      <label className="block space-y-1">
                        <span className="text-xs font-semibold text-fg-secondary">Current Password</span>
                        <input 
                          type="password" 
                          value={oldPassword}
                          onChange={(e) => setOldPassword(e.target.value)}
                          className="w-full bg-background border border-stroke rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary"
                          placeholder="••••••••"
                        />
                      </label>
                      <label className="block space-y-1">
                        <span className="text-xs font-semibold text-fg-secondary">New Password</span>
                        <input 
                          type="password" 
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full bg-background border border-stroke rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary"
                          placeholder="••••••••"
                        />
                      </label>
                      {passwordMsg && (
                        <p className={`text-xs font-bold ${passwordMsg.type === 'error' ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {passwordMsg.text}
                        </p>
                      )}
                      <button 
                        onClick={handleUpdatePassword} 
                        disabled={updatingPassword}
                        className="btn-primary w-full py-2 text-xs"
                      >
                        {updatingPassword ? "Updating..." : "Save New Password"}
                      </button>
                    </div>
                  )}
                </div>
                <div className="p-4 bg-surface border border-stroke rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold flex items-center gap-2">Current Device <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[10px] rounded-full uppercase">Active</span></p>
                    <p className="text-xs text-fg-muted mt-1">Windows • Chrome • IP verified</p>
                  </div>
                  <button onClick={handleLogout} disabled={loggingOut} className="btn-ghost text-rose-400 font-bold border border-rose-500/20 py-2 px-4 text-xs">
                    {loggingOut ? "Signing out..." : "Logout from all devices"}
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-stroke space-y-4">
                <h3 className="text-sm font-bold text-fg">Data & Privacy</h3>
                <div className="p-4 bg-surface border border-stroke rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold">Download Account Data</p>
                    <p className="text-xs text-fg-muted mt-1">Request a structured JSON export of all your workflows, tasks, and configurations.</p>
                  </div>
                  <button className="btn-primary px-4 py-2 text-xs">Request Export</button>
                </div>
                <label className="flex items-center justify-between p-4 bg-surface border border-stroke rounded-lg cursor-pointer">
                  <div>
                    <span className="text-sm font-semibold block">Allow Anonymous Usage Telemetry</span>
                    <span className="text-xs text-fg-muted">Help us improve NodLync by sending crash reports.</span>
                  </div>
                  <input type="checkbox" className="w-5 h-5 accent-primary cursor-pointer" defaultChecked={false} />
                </label>
              </div>
            </div>
          </div>
        )}

        {activeTab === "danger" && (
          <div className="glass-panel p-8 space-y-8 max-w-2xl animate-in fade-in border-rose-500/20 shadow-[0_0_20px_rgba(244,63,94,0.05)]">
            <div>
              <h2 className="text-2xl font-black text-rose-500 mb-2 flex items-center gap-2">⚠️ Danger Zone</h2>
              <p className="text-sm text-fg-muted">Proceed with extreme caution. These actions are destructive and cannot be reversed.</p>
            </div>
            
            <div className="p-6 bg-rose-500/5 border border-rose-500/20 rounded-xl space-y-4">
              <h3 className="text-lg font-bold text-fg">Delete Account</h3>
              <p className="text-sm text-fg-secondary">
                This will instantly and permanently delete your user profile, active sessions, and disconnect you from all collaborative projects. 
                <strong className="block mt-2 text-rose-400">All your API keys and unshared workflows will be destroyed.</strong>
              </p>
              
              <div className="pt-4">
                {deleteMessage && (
                  <div className={`p-3 rounded-lg mb-4 text-sm font-bold ${deleteMessage.type === 'error' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                    {deleteMessage.text}
                  </div>
                )}
                <label className="block space-y-2">
                  <span className="text-xs font-bold text-fg-muted uppercase tracking-wider">Type "DELETE" to confirm</span>
                  <input 
                    type="text" 
                    className="w-full bg-background border border-rose-500/30 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-rose-500" 
                    placeholder="DELETE"
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                  />
                </label>
                <button 
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirm !== "DELETE" || loadingDanger} 
                  className="mt-4 w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-rose-600/20"
                >
                  {loadingDanger ? "Processing Deletion..." : "Permanently Delete Account"}
                </button>
              </div>
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
