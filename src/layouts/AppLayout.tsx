import { useNavigate } from "react-router-dom";
import { supabase } from "../api/supabaseClient";
import Sidebar from "../components/Sidebar";
import useAppStore from "../store/useAppStore";
import { Outlet } from "react-router-dom";

const AppLayout = () => {
  const navigate = useNavigate();
  const user = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-background text-slate-100">
      <Sidebar />
      <main className="flex-1 flex flex-col">
        <header className="flex items-center justify-between border-b border-slate-800 bg-surface px-6 py-4">
          <div>
            <p className="text-lg font-semibold">Workspace</p>
            <p className="text-sm text-slate-400">
              Staying in sync with your WPF flow, now on the web.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium">{user?.email}</p>
              <p className="text-xs text-slate-400">Signed in</p>
            </div>
            <button className="btn-ghost" onClick={handleLogout}>
              Sign out
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto bg-background px-6 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
