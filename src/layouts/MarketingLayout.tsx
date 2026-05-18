import { Link, Outlet, useLocation } from "react-router-dom";
import useAppStore from "../store/useAppStore";
import Analytics from "../seo/Analytics";
import { useEffect, useState } from "react";

type ThemePreference = "dark" | "light" | "system";

function resolveTheme(preference: ThemePreference) {
  if (preference === "light") return "light";
  if (preference === "system" && window.matchMedia?.("(prefers-color-scheme: light)").matches) return "light";
  return "dark";
}

function applyThemePreference(preference: ThemePreference) {
  const theme = resolveTheme(preference);
  document.documentElement.classList.remove("light", "dark");
  document.documentElement.classList.add(theme);
  window.localStorage.setItem("nodlync-theme-preference", preference);
  window.localStorage.setItem("theme", theme);
}

function ThemeSwitcher() {
  const [preference, setPreference] = useState<ThemePreference>(() => {
    if (typeof window === "undefined") return "dark";
    const stored = window.localStorage.getItem("nodlync-theme-preference");
    return stored === "light" || stored === "system" || stored === "dark" ? stored : "dark";
  });

  useEffect(() => {
    applyThemePreference(preference);
    if (preference !== "system") return;
    const media = window.matchMedia?.("(prefers-color-scheme: light)");
    const onChange = () => applyThemePreference("system");
    media?.addEventListener?.("change", onChange);
    return () => media?.removeEventListener?.("change", onChange);
  }, [preference]);

  return (
    <div className="inline-flex rounded-full border border-stroke bg-panel/80 p-1 shadow-sm" aria-label="Theme preference">
      {(["dark", "light", "system"] as const).map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => setPreference(item)}
          className={`rounded-full px-3 py-1.5 text-xs font-bold capitalize transition ${
            preference === item ? "bg-primary text-on-primary shadow-[0_0_18px_rgba(56,189,248,0.28)]" : "text-fg-muted hover:text-fg"
          }`}
          aria-pressed={preference === item}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

export default function MarketingLayout() {
  const user = useAppStore((s) => s.user);
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const navLinkClass = (active: boolean) =>
    `relative rounded-full px-3 py-2 text-sm font-semibold transition ${
      active ? "bg-primary/10 text-primary" : "text-fg-secondary hover:bg-panel hover:text-fg"
    }`;

  const cta = user ? (
    <Link to="/app" className="btn-primary px-4 py-2 text-sm">
      Dashboard
    </Link>
  ) : (
    <Link to="/login" className="btn-primary px-4 py-2 text-sm">
      Sign in
    </Link>
  );

  return (
    <div className="min-h-screen bg-background text-fg transition-colors duration-300">
      <Analytics />
      <header className="sticky top-0 z-40 border-b border-stroke/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="group flex min-w-0 items-center gap-3" aria-label="NodLync home">
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-primary/20 blur-md transition group-hover:bg-primary/35" />
              <img src="/favicon.svg" alt="" className="relative h-9 w-9 object-contain" />
            </span>
            <span className="min-w-0">
              <span className="block text-lg font-black tracking-tight text-fg">NodLync</span>
              <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-fg-muted">AI operating workspace</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 rounded-full border border-stroke bg-panel/70 p-1 md:flex">
            <Link to="/features" className={navLinkClass(location.pathname.startsWith("/features"))}>
              Features
            </Link>
            <Link to="/docs" className={navLinkClass(location.pathname.startsWith("/docs"))}>
              Docs
            </Link>
            <Link to="/blog" className={navLinkClass(location.pathname.startsWith("/blog"))}>
              Blog
            </Link>
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <ThemeSwitcher />
            {cta}
          </div>

          <button
            type="button"
            className="btn-ghost px-3 py-2 md:hidden"
            aria-label="Toggle menu"
            aria-expanded={mobileNavOpen}
            onClick={() => setMobileNavOpen((v) => !v)}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileNavOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>
        </div>

        {mobileNavOpen ? (
          <div className="border-t border-stroke/60 bg-background/95 md:hidden">
            <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4">
              <Link to="/features" onClick={() => setMobileNavOpen(false)} className={navLinkClass(location.pathname.startsWith("/features"))}>
                Features
              </Link>
              <Link to="/docs" onClick={() => setMobileNavOpen(false)} className={navLinkClass(location.pathname.startsWith("/docs"))}>
                Docs
              </Link>
              <Link to="/blog" onClick={() => setMobileNavOpen(false)} className={navLinkClass(location.pathname.startsWith("/blog"))}>
                Blog
              </Link>
              <div className="flex items-center justify-between gap-3 pt-2">
                <ThemeSwitcher />
                {cta}
              </div>
            </div>
          </div>
        ) : null}
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 md:py-10">
        <Outlet />
      </main>

      <footer className="border-t border-stroke/60">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-10 text-sm text-fg-secondary md:flex-row md:items-center md:justify-between">
          <div>(c) {new Date().getFullYear()} NodLync. Provider-agnostic AI workspace.</div>
          <div className="flex gap-4">
            <Link to="/privacy" className="hover:text-fg">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-fg">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
