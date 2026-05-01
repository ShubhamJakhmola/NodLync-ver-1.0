import { Suspense, lazy, useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import LoadingScreen from "./components/LoadingScreen";
import AppLayout from "./layouts/AppLayout";
import MarketingLayout from "./layouts/MarketingLayout";
import LegacyRedirect from "./components/LegacyRedirect";

const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const ProjectsPage = lazy(() => import("./pages/ProjectsPage"));
const ProjectManagerPage = lazy(() => import("./pages/ProjectManagerPage"));
const MyStuffPage = lazy(() => import("./pages/MyStuffPage"));
const ApiVaultPage = lazy(() => import("./pages/ApiVaultPage"));
const ApiTesterPage = lazy(() => import("./pages/ApiTesterPage"));
const AiPlaygroundPage = lazy(() => import("./pages/AiPlaygroundPage"));
const WorkflowsPage = lazy(() => import("./pages/WorkflowsPage"));
const MeetingsPage = lazy(() => import("./pages/MeetingsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const DocumentationPage = lazy(() => import("./pages/DocumentationPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const LandingPage = lazy(() => import("./pages/marketing/LandingPage"));
const FeaturesPage = lazy(() => import("./pages/marketing/FeaturesPage"));
const DocsHubPage = lazy(() => import("./pages/docs/DocsHubPage"));
const DocPage = lazy(() => import("./pages/docs/DocPage"));
const MetricPage = lazy(() => import("./pages/docs/MetricPage"));
const ErrorPage = lazy(() => import("./pages/docs/ErrorPage"));
const BlogHubPage = lazy(() => import("./pages/blog/BlogHubPage"));
const BlogPostPage = lazy(() => import("./pages/blog/BlogPostPage"));
import useAppStore from "./store/useAppStore";

function App() {
  const setUser = useAppStore((s) => s.setUser);
  const [checkingSession, setCheckingSession] = useState(() => !useAppStore.getState().user);

  // Keep the "is configured" banner logic without importing the full supabase client eagerly.
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  const supabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

  useEffect(() => {
    let mounted = true;
    let authListener: any = null;

    const initAuth = async () => {
      const { supabase } = await import("./api/supabaseClient");
      
      // Intercept signup confirmation to force explicit login
      const hash = window.location.hash;
      const search = window.location.search;
      if (hash.includes('type=signup') || search.includes('type=signup')) {
        await supabase.auth.signOut();
        window.history.replaceState(null, '', '/login');
        if (mounted) {
          setUser(null);
          setCheckingSession(false);
        }
        return;
      }

      // Get initial session
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          if (session?.user) {
            setUser(session.user);
          } else {
            setUser(null);
          }
        }
        
        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event: any, session: any) => {
          if (mounted) {
            if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION') {
              setUser(session?.user ?? null);
            } else if (event === 'SIGNED_OUT') {
              setUser(null);
            }
          }
        });
        authListener = subscription;
      } catch (err) {
        console.error("Auth init failed", err);
      } finally {
        if (mounted) setCheckingSession(false);
      }
    };

    initAuth();

    return () => {
      mounted = false;
      authListener?.unsubscribe();
    };
  }, [setUser]);

  const appSettings = useAppStore((s) => s.appSettings);

  // Apply real theme globally (public + private routes)
  useEffect(() => {
    const root = document.documentElement;
    const theme = appSettings?.theme === "light" ? "light" : "dark";
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    try {
      window.localStorage.setItem("theme", theme);
    } catch {
      // ignore
    }
  }, [appSettings?.theme]);

  if (checkingSession) {
    return <LoadingScreen message="Initializing session..." />;
  }

  return (
    <>
      {!supabaseConfigured && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-600 text-white px-4 py-2 text-center text-sm">
          ⚠️ Supabase not configured. Create .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
        </div>
      )}
      <Suspense fallback={<LoadingScreen message="Loading..." />}>
        <Routes>
          {/* Marketing + Documentation */}
          <Route element={<MarketingLayout />}>
            <Route index element={<LandingPage />} />
            <Route path="/features" element={<FeaturesPage />} />
            <Route path="/docs" element={<DocsHubPage />} />
            <Route path="/docs/metrics/:metric" element={<MetricPage />} />
            <Route path="/docs/errors/:type" element={<ErrorPage />} />
            <Route path="/docs/:slug" element={<DocPage />} />
            <Route path="/blog" element={<BlogHubPage />} />
            <Route path="/blog/:slug" element={<BlogPostPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
          </Route>

          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/404" element={<NotFoundPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/app" element={<AppLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="projects/:id" element={<ProjectManagerPage />} />
              <Route path="my-stuff" element={<MyStuffPage />} />
              <Route path="api-vault" element={<ApiVaultPage />} />
              <Route path="api-tester" element={<ApiTesterPage />} />
              <Route path="ai-playground" element={<AiPlaygroundPage />} />
              <Route path="workflows" element={<WorkflowsPage />} />
              <Route path="meetings" element={<MeetingsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="docs" element={<DocumentationPage />} />
            </Route>
          </Route>

          {/* Back-compat redirects for older deep links */}
          <Route path="/projects" element={<Navigate to="/app/projects" replace />} />
          <Route path="/projects/:id" element={<LegacyRedirect template="/app/projects/:id" />} />
          <Route path="/my-stuff" element={<Navigate to="/app/my-stuff" replace />} />
          <Route path="/api-vault" element={<Navigate to="/app/api-vault" replace />} />
          <Route path="/api-tester" element={<Navigate to="/app/api-tester" replace />} />
          <Route path="/ai-playground" element={<Navigate to="/app/ai-playground" replace />} />
          <Route path="/workflows" element={<Navigate to="/app/workflows" replace />} />
          <Route path="/meetings" element={<Navigate to="/app/meetings" replace />} />
          <Route path="/settings" element={<Navigate to="/app/settings" replace />} />

          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default App;
