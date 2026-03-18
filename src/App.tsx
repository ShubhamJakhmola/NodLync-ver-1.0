import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { supabase, supabaseConfigured } from "./api/supabaseClient";
import ProtectedRoute from "./components/ProtectedRoute";
import LoadingScreen from "./components/LoadingScreen";
import AppLayout from "./layouts/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import ProjectsPage from "./pages/ProjectsPage";
import ProjectManagerPage from "./pages/ProjectManagerPage";
import MyStuffPage from "./pages/MyStuffPage";
import ApiVaultPage from "./pages/ApiVaultPage";
import ApiTesterPage from "./pages/ApiTesterPage";
import AiPlaygroundPage from "./pages/AiPlaygroundPage";
import WorkflowsPage from "./pages/WorkflowsPage";
import MeetingsPage from "./pages/MeetingsPage";
import SettingsPage from "./pages/SettingsPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import useAppStore from "./store/useAppStore";

function App() {
  const setUser = useAppStore((s) => s.setUser);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) console.error("Session error", error.message);
      if (data.session?.user) setUser(data.session.user);
      setCheckingSession(false);
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event: string, session: { user: any } | null) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
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
    </>
  );
}

export default App;
