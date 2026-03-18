import { NavLink, useNavigate } from "react-router-dom";
import useAppStore from "../store/useAppStore";

const navItems = [
  { to: "/", label: "Dashboard" },
  { to: "/projects", label: "Projects" },
  { to: "/my-stuff", label: "My Stuff" },
  { to: "/api-vault", label: "API Vault" },
  { to: "/api-tester", label: "API Tester" },
  { to: "/ai-playground", label: "AI Playground" },
  { to: "/workflows", label: "Workflows" },
  { to: "/meetings", label: "Meetings" },
  { to: "/settings", label: "Settings" },
];

const Sidebar = () => {
  const navigate = useNavigate();
  const user = useAppStore((s) => s.user);
  const userProfile = useAppStore((s) => s.userProfile);

  return (
    <aside className="w-64 bg-surface border-r border-slate-800 p-4 flex flex-col gap-4">
      <div className="flex items-center gap-3 px-2">
        <div className="h-10 w-10 flex items-center justify-center">
          <img src="/favicon.svg" alt="NodLync Logo" className="w-full h-full object-contain drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]" />
        </div>
        <div>
          <p className="text-lg font-semibold tracking-wide">NodLync</p>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">AI ops workspace</p>
        </div>
      </div>
      <nav className="flex-1">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                    isActive
                      ? "bg-primary/20 text-primary"
                      : "text-slate-300 hover:bg-slate-800"
                  }`
                }
                end={item.to === "/"}
              >
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
          </ul>
        </nav>

        {/* Profile Block at Bottom */}
        <div
          onClick={() => navigate("/settings?tab=profile")}
          className="mt-auto border-t border-slate-800 pt-4 flex items-center gap-3 px-2 cursor-pointer hover:bg-slate-800/40 rounded-xl transition"
        >
          <div className="w-10 h-10 rounded-full bg-surface border border-slate-700 shrink-0 overflow-hidden flex items-center justify-center relative">
            {userProfile?.avatar_url ? (
              <img src={userProfile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-primary font-bold text-sm tracking-wider">
                {userProfile?.display_name?.charAt(0) || user?.email?.charAt(0) || "U"}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0 pr-2">
            <p className="text-sm font-semibold truncate text-slate-200">
              {userProfile?.display_name || "User"}
            </p>
            <p className="text-[10px] text-slate-500 font-medium truncate uppercase tracking-widest">
              My Profile
            </p>
          </div>
        </div>

      </aside>
    );
  };

  export default Sidebar;
