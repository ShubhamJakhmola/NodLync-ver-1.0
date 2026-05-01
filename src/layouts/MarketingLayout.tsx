import { Link, Outlet, useLocation } from "react-router-dom";
import useAppStore from "../store/useAppStore";
import Analytics from "../seo/Analytics";
import { useEffect, useState } from "react";

export default function MarketingLayout() {
  const user = useAppStore((s) => s.user);
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  const navLinkClass = (active: boolean) =>
    `text-sm ${active ? "text-fg" : "text-fg-secondary hover:text-fg"} transition-colors`;

  return (
    <div className="min-h-screen bg-background text-fg">
      <Analytics />
      <header className="sticky top-0 z-40 border-b border-stroke/60 bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <Link to="/" className="font-bold tracking-tight text-fg">
            NodLync
          </Link>

          <nav className="hidden md:flex items-center gap-5">
            <Link to="/features" className={navLinkClass(location.pathname.startsWith("/features"))}>
              Features
            </Link>
            <Link to="/docs" className={navLinkClass(location.pathname.startsWith("/docs"))}>
              Docs
            </Link>
            <Link to="/blog" className={navLinkClass(location.pathname.startsWith("/blog"))}>
              Blog
            </Link>
            {user ? (
              <Link to="/app" className="btn-primary px-4 py-2 text-sm">
                Dashboard
              </Link>
            ) : (
              <Link to="/login" className="btn-primary px-4 py-2 text-sm">
                Sign in
              </Link>
            )}
          </nav>

          <button
            type="button"
            className="md:hidden btn-ghost px-3 py-2"
            aria-label="Open menu"
            aria-expanded={mobileNavOpen}
            onClick={() => setMobileNavOpen((v) => !v)}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {mobileNavOpen ? (
          <div className="md:hidden border-t border-stroke/60 bg-background/95">
            <div className="mx-auto max-w-6xl px-4 py-4 flex flex-col gap-3">
              <Link to="/features" className={navLinkClass(location.pathname.startsWith("/features"))}>
                Features
              </Link>
              <Link to="/docs" className={navLinkClass(location.pathname.startsWith("/docs"))}>
                Docs
              </Link>
              <Link to="/blog" className={navLinkClass(location.pathname.startsWith("/blog"))}>
                Blog
              </Link>
              {user ? (
                <Link to="/app" className="btn-primary px-4 py-2 text-sm text-center">
                  Dashboard
                </Link>
              ) : (
                <Link to="/login" className="btn-primary px-4 py-2 text-sm text-center">
                  Sign in
                </Link>
              )}
            </div>
          </div>
        ) : null}
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10">
        <Outlet />
      </main>

      <footer className="border-t border-stroke/60">
        <div className="mx-auto max-w-6xl px-4 py-10 flex flex-col md:flex-row gap-4 md:items-center md:justify-between text-sm text-fg-secondary">
          <div>© {new Date().getFullYear()} NodLync</div>
          <div className="flex gap-4">
            <Link to="/privacy" className="hover:text-fg">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-fg">
              Terms
            </Link>
            <a href="/llms.txt" className="hover:text-fg">
              AI (llms.txt)
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
