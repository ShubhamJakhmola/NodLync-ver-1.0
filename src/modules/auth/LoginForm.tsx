import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "../../api/supabaseClient";
import useAppStore from "../../store/useAppStore";

const LoginForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const setUser = useAppStore((s) => s.setUser);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const hasAgreedTerms = useAppStore((s) => s.hasAgreedTerms);
  const setHasAgreedTerms = useAppStore((s) => s.setHasAgreedTerms);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);

  const checkAndCreateProfile = async (userId: string, email: string, metadata: any) => {
    try {
      // Force token refresh to ensure JWT claims are entirely up to date before hitting RLS
      await supabase.auth.refreshSession();

      const { data, error } = await supabase.from('user_profiles').select('id, display_name').eq('id', userId).maybeSingle();
      
      const defaultName = metadata?.display_name || email.split('@')[0];

      if (!data && !error) {
        // Fallback profile creation using upsert to guarantee idempotency and avoid race conditions
        await supabase.from('user_profiles').upsert(
          { id: userId, display_name: defaultName }, 
          { onConflict: 'id' }
        );
      } else if (data && data.display_name === "New User" && defaultName !== "New User") {
        // Sync display name if it's still the default but we have better metadata
        await supabase.from('user_profiles').update({ display_name: defaultName }).eq('id', userId);
      }
    } catch (err) {
      console.error("Profile check failed", err);
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!hasAgreedTerms) {
      setError("Please confirm you have read the Privacy Policy and Terms & Conditions.");
      return;
    }

    if (lockoutUntil && Date.now() < lockoutUntil) {
      const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
      setError(`Too many attempts. Try again in ${remaining}s.`);
      return;
    }

    setLoading(true);
    setError(null);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Brute force protection logic
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      
      if (newAttempts >= 5) {
        // Lockout for 30 seconds after 5 failed attempts
        setLockoutUntil(Date.now() + 30000);
        setError("Too many attempts. Try again in 30s.");
      } else {
        // Generic error regardless of whether email exists or bad password
        setError("Invalid credentials. Please try again.");
      }
    } else if (data.user) {
      // Reset attempts
      setFailedAttempts(0);
      setLockoutUntil(null);

      // Verify profile resilience
      if (data.user.email) {
        await checkAndCreateProfile(data.user.id, data.user.email, data.user.user_metadata);
      }

      setUser(data.user);
      const redirect = (location.state as any)?.from?.pathname ?? "/projects";
      navigate(redirect, { replace: true });
    }
    setLoading(false);
  };

  return (
    <div className="glass-panel max-w-md w-full px-8 py-6 space-y-6 shadow-xl">
      <div>
        <p className="text-2xl font-semibold">Welcome back</p>
        <p className="text-sm text-fg-muted">
          Sign in to continue working on your projects.
        </p>
      </div>
      <form className="space-y-4" onSubmit={onSubmit}>
        <label className="block space-y-1">
          <span className="text-sm text-fg-secondary">Email</span>
          <input
            type="email"
            className="w-full rounded-lg border border-stroke bg-surface px-3 py-2 text-fg focus:outline-none focus:ring-2 focus:ring-primary"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm text-fg-secondary">Password</span>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              className="w-full rounded-lg border border-stroke bg-surface px-3 py-2 text-fg focus:outline-none focus:ring-2 focus:ring-primary pr-10"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-fg-muted hover:text-fg-secondary"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
        </label>
        {error && (
          <p className="text-sm text-rose-400 bg-rose-900/30 border border-rose-800 rounded-md px-3 py-2">
            {error}
          </p>
        )}
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <div className="text-sm text-fg-muted">
        <div className="flex items-start gap-2 mt-2">
          <input
            id="login-agree"
            type="checkbox"
            checked={hasAgreedTerms}
            onChange={(e) => setHasAgreedTerms(e.target.checked)}
            className="h-4 w-4 text-primary rounded bg-surface border border-stroke-strong"
          />
          <label htmlFor="login-agree" className="leading-relaxed">
            I have read and agree to the <Link className="text-primary hover:underline" to="/privacy">Privacy Policy</Link> and <Link className="text-primary hover:underline" to="/terms">Terms & Conditions</Link>.
          </label>
        </div>

        <p className="text-center mt-3">
          <Link className="text-primary hover:underline" to="/forgot-password">Forgot password?</Link>
        </p>
      </div>

      <p className="text-sm text-fg-muted text-center">
        Don&apos;t have an account?{" "}
        <Link className="text-primary hover:underline" to="/register">
          Register
        </Link>
      </p>
    </div>
  );
};

export default LoginForm;
