import { NavLink, useNavigate } from "react-router-dom";
import useAppStore from "../store/useAppStore";
import { AiProactiveHints } from "./AiProactiveHints";

const Icons = {
  Dashboard: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  Projects: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  ),
  MyStuff: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
    </svg>
  ),
  ApiVault: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  ApiTester: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
    </svg>
  ),
  AiPlayground: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  Workflows: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  ),
  Meetings: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Settings: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
};

const navItems = [
  { to: "/", label: "Dashboard", Icon: Icons.Dashboard },
  { to: "/projects", label: "Projects", Icon: Icons.Projects },
  { to: "/my-stuff", label: "My Stuff", Icon: Icons.MyStuff },
  { to: "/api-vault", label: "API Vault", Icon: Icons.ApiVault },
  { to: "/api-tester", label: "API Tester", Icon: Icons.ApiTester },
  { to: "/ai-playground", label: "AI Playground", Icon: Icons.AiPlayground },
  { to: "/workflows", label: "Workflows", Icon: Icons.Workflows },
  { to: "/meetings", label: "Meetings", Icon: Icons.Meetings },
  { to: "/settings", label: "Settings", Icon: Icons.Settings },
];

const Sidebar = ({ onClose }: { onClose?: () => void }) => {
  const navigate = useNavigate();
  const user = useAppStore((s) => s.user);
  const userProfile = useAppStore((s) => s.userProfile);

  const handleNavClick = (to: string) => {
    const isMobile = window.innerWidth < 1024;
    
    // On mobile, force hierarchy: any sidebar nav should have Dashboard as its 'Back' parent
    if (isMobile && to !== "/") {
      // First, effectively make the Dashboard the "entry point" in history
      // We use replace: true for the first step to avoid cluttering but ensure it's the base
      navigate("/", { replace: false });
      // Then push the target
      setTimeout(() => {
        navigate(to);
        onClose?.();
      }, 10);
    } else {
      navigate(to);
      onClose?.();
    }
  };

  return (
    <aside className="flex h-full w-72 flex-col gap-6 overflow-y-auto border-r border-stroke bg-surface p-6 custom-scrollbar sm:w-80 lg:w-64">
      <div className="flex items-center justify-between gap-4 px-2 lg:justify-start">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center">
            <img
              src="/favicon.svg"
              alt="NodLync Logo"
              className="h-full w-full object-contain drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]"
            />
          </div>
          <div className="min-w-0">
            <p className="text-xl font-bold tracking-tight text-fg">NodLync</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-fg-muted">AI ops workspace</p>
          </div>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 font-bold text-fg-muted hover:bg-panel lg:hidden"
          >
            ✕
          </button>
        ) : null}
      </div>

      <nav className="mt-2 flex-1">
        <ul className="space-y-1.5 font-medium">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                onClick={(e) => {
                  if (onClose) {
                    e.preventDefault();
                    handleNavClick(item.to);
                  }
                }}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-xl border px-4 py-2.5 text-sm font-semibold transition duration-200 ${
                    isActive
                      ? "border-primary/20 bg-primary/10 text-primary shadow-[0_0_15px_rgba(56,189,248,0.1)]"
                      : "border-transparent text-fg-muted hover:bg-panel/80 hover:text-fg-secondary"
                  }`
                }
                end={item.to === "/"}
              >
                <div className="transition-transform duration-200 group-hover:scale-110">
                  <item.Icon />
                </div>
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex-shrink-0">
        <AiProactiveHints />
      </div>

      <div
        onClick={() => {
          navigate("/settings?tab=profile");
          onClose?.();
        }}
        className="mt-6 flex cursor-pointer items-center gap-4 border-t border-stroke px-2 pt-6 group"
      >
        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-stroke bg-panel transition-colors group-hover:border-primary/50">
          {userProfile?.avatar_url ? (
            <img src={userProfile.avatar_url} alt="Profile" className="h-full w-full object-cover" />
          ) : (
            <span className="text-sm font-bold tracking-wider uppercase text-primary">
              {userProfile?.display_name?.charAt(0) || user?.email?.charAt(0) || "U"}
            </span>
          )}
          <div className="absolute inset-x-0 bottom-0 flex h-1/3 items-center justify-center bg-black/40 translate-y-full backdrop-blur-sm transition-transform group-hover:translate-y-0">
            <span className="text-[6px] font-bold tracking-tighter text-white">EDIT</span>
          </div>
        </div>
        <div className="min-w-0 flex-1 pr-2">
          <p className="truncate text-sm font-bold text-fg-secondary transition-colors group-hover:text-primary">
            {userProfile?.display_name || "User"}
          </p>
          <p className="mt-0.5 truncate text-[10px] font-bold uppercase tracking-widest text-fg-muted">
            My Profile ➔
          </p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
