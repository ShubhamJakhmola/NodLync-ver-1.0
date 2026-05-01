import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../api/supabaseClient";
import useAppStore from "../../store/useAppStore";

const RegisterForm = () => {
  const navigate = useNavigate();
  const setUser = useAppStore((s) => s.setUser);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const resendVerification = async () => {
    if (!email || cooldown > 0) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
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

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!agreed) {
      setError("Please confirm you have read the Privacy Policy and Terms & Conditions.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName || "New User"
        }
      }
    });
    
    if (error) {
      if (error.message.toLowerCase().includes('already registered')) {
        setError("User already exists. Please log in or reset your password.");
      } else {
        setError("Sign up failed. Please check your details and try again.");
      }
    } else if (data.user) {
      // If session is null, email confirmation is required.
      if (!data.session) {
        setVerificationSent(true);
      } else {
        // If email confirmation is disabled on the backend, login immediately.
        setUser(data.user);
        navigate("/projects", { replace: true });
      }
    }
    setLoading(false);
  };

  if (verificationSent) {
    return (
      <div className="glass-panel max-w-md w-full px-8 py-8 space-y-6 shadow-xl text-center">
        <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-fg">Verify your email</h2>
        <p className="text-fg-secondary">
          A verification email has been sent to <span className="font-bold text-primary">{email}</span>. Please check your inbox and verify your email to continue.
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
            className="btn-secondary w-full disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? "Sending..." : cooldown > 0 ? `Resend Verification (${cooldown}s)` : "Resend Verification Email"}
          </button>
          <button 
            onClick={() => navigate("/login")} 
            className="btn-ghost w-full"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel max-w-md w-full px-8 py-6 space-y-6 shadow-xl">
      <div>
        <p className="text-2xl font-semibold">Create account</p>
        <p className="text-sm text-fg-muted">
          Start managing NodLync from the web.
        </p>
      </div>
      <form className="space-y-4" onSubmit={onSubmit}>
        <label className="block space-y-1">
          <span className="text-sm text-fg-secondary">Display Name</span>
          <input
            type="text"
            className="w-full rounded-lg border border-stroke bg-surface px-3 py-2 text-fg focus:outline-none focus:ring-2 focus:ring-primary"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </label>
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
              minLength={6}
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
        <label className="block space-y-1">
          <span className="text-sm text-fg-secondary">Confirm password</span>
          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              className="w-full rounded-lg border border-stroke bg-surface px-3 py-2 text-fg focus:outline-none focus:ring-2 focus:ring-primary pr-10"
              required
              minLength={6}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-fg-muted hover:text-fg-secondary"
              onClick={() => setShowConfirm(!showConfirm)}
            >
              {showConfirm ? (
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
          {loading ? "Creating account..." : "Register"}
        </button>
      </form>

      <div className="text-sm text-fg-muted">
        <div className="flex items-start gap-2 mt-2">
          <input
            id="register-agree"
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="h-4 w-4 text-primary rounded bg-surface border border-stroke-strong"
          />
          <label htmlFor="register-agree" className="leading-relaxed">
            I have read and agree to the <Link className="text-primary hover:underline" to="/privacy">Privacy Policy</Link> and <Link className="text-primary hover:underline" to="/terms">Terms & Conditions</Link>.
          </label>
        </div>
      </div>

      <p className="text-sm text-fg-muted text-center">
        Already registered?{" "}
        <Link className="text-primary hover:underline" to="/login">
          Sign in
        </Link>
      </p>
    </div>
  );
};

export default RegisterForm;
