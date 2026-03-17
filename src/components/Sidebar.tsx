import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/", label: "Dashboard" },
  { to: "/projects", label: "Projects" },
  { to: "/api-vault", label: "API Vault" },
  { to: "/api-tester", label: "API Tester" },
  { to: "/ai-playground", label: "AI Playground" },
  { to: "/workflows", label: "Workflows" },
  { to: "/meetings", label: "Meetings" },
  { to: "/logs", label: "Logs" },
  { to: "/reports", label: "Reports" },
  { to: "/settings", label: "Settings" },
  { to: "/profile", label: "Profile" },
];

const Sidebar = () => {
  return (
    <aside className="w-64 bg-surface border-r border-slate-800 p-4 flex flex-col gap-4">
      <div className="flex items-center gap-3 px-2">
        <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-bold">
          NL
        </div>
        <div>
          <p className="text-lg font-semibold">NodLync</p>
          <p className="text-xs text-slate-400">AI ops workspace</p>
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
    </aside>
  );
};

export default Sidebar;
