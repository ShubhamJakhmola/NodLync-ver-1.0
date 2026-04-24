import { useState, useEffect } from "react";
import useAppStore from "../store/useAppStore";

export const AiProactiveHints = () => {
  const projects = useAppStore((s) => s.projects);
  const user = useAppStore((s) => s.user);
  const [hint, setHint] = useState<string | null>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!user) return;

    if (projects.length === 0) {
      setHint("Pro-tip: Create your first project to unlock milestones and tasks.");
    } else if (projects.length > 0 && projects.length < 3) {
      setHint("Smart Suggestion: Link an API key in the Vault to enable AI insights for your projects.");
    } else {
      setHint("Team Mode: Invite contributors in the 'Team' tab of any project manager.");
    }
  }, [projects.length, user]);

  if (!hint || !visible) return null;

  return (
    <div className="mx-2 mt-4 glass-panel p-4 relative group border-primary/20 bg-primary/5 animate-in slide-in-from-bottom-2 duration-700">
      <button 
        onClick={() => setVisible(false)}
        className="absolute top-2 right-2 text-fg-muted hover:text-fg text-[10px] opacity-0 group-hover:opacity-100 transition"
      >
        ✕
      </button>
      <div className="flex items-start gap-3">
        <span className="text-lg">🤖</span>
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-primary">AI Insight</p>
          <p className="text-[11px] text-fg-secondary leading-relaxed">
            {hint}
          </p>
        </div>
      </div>
    </div>
  );
};
