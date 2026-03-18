interface TeamMember {
  id: string;
  email: string;
  role: "Owner" | "Contributor" | "Viewer";
  avatarColor: string;
}

interface Props {
  members: TeamMember[];
}

// Deterministic color from string
function colorFromString(str: string) {
  const colors = [
    "bg-primary/20 text-primary",
    "bg-accent/20 text-accent",
    "bg-emerald-500/20 text-emerald-400",
    "bg-amber-500/20 text-amber-400",
    "bg-rose-500/20 text-rose-400",
    "bg-cyan-500/20 text-cyan-400",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + hash * 31;
  return colors[Math.abs(hash) % colors.length];
}

const ROLE_STYLES: Record<string, string> = {
  Owner: "text-primary border-primary/30 bg-primary/10",
  Contributor: "text-emerald-400 border-emerald-700 bg-emerald-900/20",
  Viewer: "text-slate-400 border-slate-700 bg-slate-800",
};

const TeamCard = ({ members }: Props) => {
  if (members.length === 0) {
    return (
      <div className="glass-panel p-5 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-base">👥</span>
          <h3 className="font-semibold text-slate-200 text-sm">Team</h3>
        </div>
        <p className="text-xs text-slate-500 italic text-center py-3">
          No team members configured yet.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-panel p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">👥</span>
          <h3 className="font-semibold text-slate-200 text-sm">Team</h3>
        </div>
        <span className="text-xs text-slate-500">{members.length} members</span>
      </div>

      <ul className="space-y-2">
        {members.map((member) => {
          const initials = member.email
            .split("@")[0]
            .slice(0, 2)
            .toUpperCase();
          const colorClass = colorFromString(member.email);

          return (
            <li
              key={member.id}
              className="flex items-center gap-3 py-1.5 group"
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${colorClass}`}
              >
                {initials}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-200 truncate font-medium">
                  {member.email.split("@")[0]}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {member.email}
                </p>
              </div>

              {/* Role badge */}
              <span
                className={`text-[10px] font-semibold border rounded-full px-2 py-0.5 flex-shrink-0 ${
                  ROLE_STYLES[member.role] ?? ROLE_STYLES["Viewer"]
                }`}
              >
                {member.role}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export { type TeamMember };
export default TeamCard;
