import { useMemo, useState } from "react";
import useAppStore from "../store/useAppStore";

export const AiProactiveHints = () => {
  const projects = useAppStore((s) => s.projects);
  const user = useAppStore((s) => s.user);
  const [visible, setVisible] = useState(true);

  const hint = useMemo(() => {
    if (!user) return null;
    if (projects.length === 0) {
      return "Start with a project. It gives your prompts, tasks, meetings, and workflows a shared home.";
    }
    if (projects.length < 3) {
      return "Next step: add a provider key in API Vault before running AI requests in the Playground.";
    }
    return "Team tip: invite contributors from a project Team tab so AI work stays connected to owners.";
  }, [projects.length, user]);

  if (!hint || !visible) return null;

  return (
    <div className="mx-2 mt-4 glass-panel p-4 relative group border-primary/20 bg-primary/5 animate-in slide-in-from-bottom-2 duration-700">
      <button
        type="button"
        aria-label="Dismiss workspace hint"
        onClick={() => setVisible(false)}
        className="absolute right-2 top-2 rounded-md px-2 py-1 text-[10px] text-fg-muted opacity-0 transition hover:bg-panel hover:text-fg group-hover:opacity-100 focus:opacity-100"
      >
        Close
      </button>
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-xs font-black text-primary">
          TIP
        </span>
        <div className="space-y-1 pr-8">
          <p className="text-[10px] font-black uppercase tracking-widest text-primary">Workspace Guide</p>
          <p className="text-[11px] text-fg-secondary leading-relaxed">{hint}</p>
        </div>
      </div>
    </div>
  );
};
