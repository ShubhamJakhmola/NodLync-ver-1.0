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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError(error.message);
    } else if (data.user) {
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
        <p className="text-sm text-slate-400">
          Sign in to continue working on your projects.
        </p>
      </div>
      <form className="space-y-4" onSubmit={onSubmit}>
        <label className="block space-y-1">
          <span className="text-sm text-slate-300">Email</span>
          <input
            type="email"
            className="w-full rounded-lg border border-slate-700 bg-surface px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm text-slate-300">Password</span>
          <input
            type="password"
            className="w-full rounded-lg border border-slate-700 bg-surface px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
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
      <p className="text-sm text-slate-400 text-center">
        Don&apos;t have an account?{" "}
        <Link className="text-primary hover:underline" to="/register">
          Register
        </Link>
      </p>
    </div>
  );
};

export default LoginForm;
