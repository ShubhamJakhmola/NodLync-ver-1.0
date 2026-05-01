import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import useAppStore from "../store/useAppStore";
import { useState } from "react";
import { supabase } from "../api/supabaseClient";

const ProtectedRoute = () => {
  const user = useAppStore((s) => s.user);
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Ensure email is verified if using email auth
  const isEmailUnverified = user.email && !user.email_confirmed_at && user.app_metadata?.provider === 'email';

  if (isEmailUnverified) {
    const resendVerification = async () => {
      if (!user.email || cooldown > 0) return;
      setLoading(true);
      setError(null);
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
      });
      if (error) {
        setError("Failed to resend verification: " + error.message);
      } else {
        setError("Verification email resent. Please check your inbox.");
        setCooldown(60);
        const timer = setInterval(() => {
          setCooldown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
      setLoading(false);
    };

    const handleLogout = async () => {
      await supabase.auth.signOut();
      useAppStore.getState().setUser(null);
      navigate("/login");
    };

    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 relative overflow-hidden">
        <div className="glass-panel max-w-md w-full px-8 py-8 space-y-6 shadow-xl text-center z-10">
          <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/30">
            <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-fg">Email Verification Required</h2>
          <p className="text-fg-secondary">
            Your account (<span className="font-bold text-primary">{user.email}</span>) is active, but your email address has not been verified yet.
          </p>
          <p className="text-sm text-fg-muted mt-2">
            Please check your inbox and verify your email to access the dashboard. If you've just verified, refresh the page.
          </p>
          
          {error && (
            <p className="text-sm text-primary bg-primary/10 border border-primary/20 rounded-md px-3 py-2 mt-4">
              {error}
            </p>
          )}

          <div className="pt-6 border-t border-stroke space-y-4">
            <button 
              onClick={resendVerification} 
              disabled={loading || cooldown > 0}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? "Sending..." : cooldown > 0 ? `Resend Verification (${cooldown}s)` : "Resend Verification Email"}
            </button>
            <button 
              onClick={handleLogout} 
              className="btn-ghost w-full"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <Outlet />;
};

export default ProtectedRoute;
