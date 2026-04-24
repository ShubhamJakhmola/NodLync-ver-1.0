import { Suspense, lazy, useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import LoadingScreen from "./components/LoadingScreen";
import AppLayout from "./layouts/AppLayout";

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
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
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
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/404" element={<NotFoundPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
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
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default App;
