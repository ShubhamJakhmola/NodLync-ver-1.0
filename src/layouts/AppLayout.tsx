import Sidebar from "../components/Sidebar";
import RouteErrorBoundary from "../components/RouteErrorBoundary";
import { Outlet } from "react-router-dom";
import useAppStore from "../store/useAppStore";
import { useEffect, useState } from "react";
import { getProfile, getSettings } from "../api/settingsApi";
import InlineSpinner from "../components/InlineSpinner";
import { useProjectBootstrap } from "../hooks/useProjectBootstrap";

const AppLayout = () => {
  const user = useAppStore((s) => s.user);
  const setUserProfile = useAppStore((s) => s.setUserProfile);
  const setAppSettings = useAppStore((s) => s.setAppSettings);
  useProjectBootstrap();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Global Mobile Hierarchy Resilience
  // Seeds history so 'back' gesture from any leaf page on mobile returns to Dashboard
  useEffect(() => {
    const isMobile = window.innerWidth < 1024;
    const isRoot = window.location.pathname === "/app";
    const hasSeeded = sessionStorage.getItem("history-seeded");

    if (isMobile && !isRoot && !hasSeeded) {
      const currentPath = window.location.pathname + window.location.search;
      // Replace current entry with / then push the actual page
      // This effectively puts Dashboard "behind" the current page in history
      window.history.replaceState({ seeded: true }, "", "/app");
      window.history.pushState({ seeded: true }, "", currentPath);
      sessionStorage.setItem("history-seeded", "true");
    }
  }, []);
  const [globalsLoading, setGlobalsLoading] = useState(true);
  const [globalsError, setGlobalsError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setGlobalsLoading(false);
      setGlobalsError(null);
      return;
    }
    const fetchGlobals = async () => {
      try {
        setGlobalsLoading(true);
        setGlobalsError(null);
        const [pRes, sRes] = await Promise.all([
          getProfile(user.id),
          getSettings(user.id)
        ]);
        if (pRes.error || sRes.error) {
          console.error("Failed to load global settings", {
            profileError: pRes.error,
            settingsError: sRes.error,
          });
          setGlobalsError(
            pRes.error?.message ??
            sRes.error?.message ??
            "Failed to load your workspace settings."
          );
        }
        setUserProfile(pRes.data);
        setAppSettings(sRes.data);
      } catch (error: any) {
        console.error("Unexpected global settings failure", error);
        setGlobalsError(error?.message ?? "Failed to load your workspace settings.");
      } finally {
        setGlobalsLoading(false);
      }
    };
    void fetchGlobals();
  }, [user, setUserProfile, setAppSettings]);

  const appSettings = useAppStore((s) => s.appSettings);
  const userProfile = useAppStore((s) => s.userProfile);
  const projectsError = useAppStore((s) => s.projectsError);
  const hasWarmWorkspaceState = !!appSettings || !!userProfile;

  if (globalsLoading && !hasWarmWorkspaceState) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-fg-secondary gap-3">
        <InlineSpinner />
        <span>Loading workspace...</span>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-fg">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Desktop: fixed, Mobile: drawer */}
      <div className={`fixed inset-y-0 left-0 z-50 transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 lg:z-0`}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      <main className="flex-1 flex flex-col h-full bg-background relative z-0 min-w-0">
        {/* Mobile Header with Toggle */}
        <header className="lg:hidden flex items-center justify-between px-6 py-4 border-b border-stroke bg-surface/50 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <img src="/favicon.svg" alt="Logo" className="w-8 h-8" />
            <span className="font-bold tracking-tight">NodLync</span>
          </div>
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-panel rounded-lg text-fg-secondary"
            aria-label="Open menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-2 sm:px-4 py-2 sm:py-4 custom-scrollbar">
          <div className="max-w-[1800px] mx-auto w-full">
            {globalsLoading && hasWarmWorkspaceState ? (
              <div className="mb-4 rounded-2xl border border-stroke/60 bg-surface/70 px-4 py-3 text-sm text-fg-muted shadow-sm">
                Restoring your workspace...
              </div>
            ) : null}
            {globalsError && (
              <div className="mb-4 rounded-2xl border border-rose-800/40 bg-rose-950/30 px-5 py-4 text-sm text-rose-200">
                {globalsError}
              </div>
            )}
            {projectsError && (
              <div className="mb-4 rounded-2xl border border-rose-800/40 bg-rose-950/30 px-5 py-4 text-sm text-rose-200">
                {projectsError}
              </div>
            )}
            <RouteErrorBoundary>
              <Outlet />
            </RouteErrorBoundary>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
