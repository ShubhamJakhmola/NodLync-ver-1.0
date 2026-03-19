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
import useAppStore from "./store/useAppStore";

function App() {
  const setUser = useAppStore((s) => s.setUser);
  const [checkingSession, setCheckingSession] = useState(true);

  // Keep the "is configured" banner logic without importing the full supabase client eagerly.
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  const supabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const init = async () => {
      const { supabase } = await import("./api/supabaseClient");

      const { data, error } = await supabase.auth.getSession();
      if (error) console.error("Session error", error.message);
      if (data.session?.user) setUser(data.session.user);

      const { data: listener } = supabase.auth.onAuthStateChange(
        (_event: string, session: { user: any } | null) => {
          setUser(session?.user ?? null);
        }
      );

      unsubscribe = () => listener.subscription.unsubscribe();
      setCheckingSession(false);
    };

    void init();

    return () => {
      unsubscribe?.();
    };
  }, [setUser]);

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

          <Route path="*" element={<Navigate to="/projects" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default App;
