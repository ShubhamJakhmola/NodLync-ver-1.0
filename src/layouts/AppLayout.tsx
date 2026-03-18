import Sidebar from "../components/Sidebar";
import { Outlet } from "react-router-dom";
import useAppStore from "../store/useAppStore";
import { useEffect } from "react";
import { getProfile, getSettings } from "../api/settingsApi";

const AppLayout = () => {
  const user = useAppStore((s) => s.user);
  const setUserProfile = useAppStore((s) => s.setUserProfile);
  const setAppSettings = useAppStore((s) => s.setAppSettings);

  useEffect(() => {
    if (!user) return;
    const fetchGlobals = async () => {
      const [pRes, sRes] = await Promise.all([
        getProfile(user.id),
        getSettings(user.id)
      ]);
      setUserProfile(pRes.data);
      setAppSettings(sRes.data);
    };
    fetchGlobals();
  }, [user, setUserProfile, setAppSettings]);

  const appSettings = useAppStore((s) => s.appSettings);

  // Apply real theme globally
  useEffect(() => {
    if (appSettings?.theme === "light") {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    }
  }, [appSettings?.theme]);

  // Make sure we have "dark" on by default everywhere if not overridden
  return (
    <div className={`flex h-screen text-slate-100 overflow-hidden ${appSettings?.theme === "light" ? "bg-slate-50 text-slate-900" : "bg-background"}`}>
      <Sidebar />
      <main className="flex-1 flex flex-col h-full bg-background relative z-0">
        <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
