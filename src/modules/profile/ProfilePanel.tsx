import useAppStore from "../../store/useAppStore";

const ProfilePanel = () => {
  const user = useAppStore((s) => s.user);
  return (
    <div className="glass-panel p-6 space-y-3">
      <p className="text-xl font-semibold">Profile</p>
      <p className="text-sm text-slate-400">
        Mirrors your WPF profile card. Extend with avatar upload and MFA states
        as needed.
      </p>
      <div className="rounded-lg border border-slate-800 bg-surface px-4 py-3 text-sm text-slate-300 space-y-1">
        <p>Email: {user?.email}</p>
        <p>Last sign-in: {user?.last_sign_in_at ?? "—"}</p>
      </div>
    </div>
  );
};

export default ProfilePanel;
