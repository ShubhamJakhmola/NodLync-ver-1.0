import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

const DAILY_IDEAS = [
  { title: "Meeting Notes To Tasks", description: "Summarize a team meeting, identify decisions, and create reviewed follow-up tasks." },
  { title: "Provider Comparison", description: "Run one prompt across two approved providers and compare quality, speed, and cost expectations." },
  { title: "Project Brief Builder", description: "Turn rough notes into a project description, milestone list, and first task set." },
  { title: "Support Reply Draft", description: "Use a saved prompt to draft a customer reply, then review it before sending." },
  { title: "Debug Trace Summary", description: "Paste a failed provider trace and ask for likely causes plus next checks." },
  { title: "Research Synthesis", description: "Condense source notes into themes, open questions, and project-ready decisions." },
  { title: "Image Prompt Review", description: "Improve a visual prompt before sending it to your chosen image provider." },
];

export default function DashboardIdeaCard() {
  const navigate = useNavigate();

  const todayIdea = useMemo(() => {
    const now = new Date();
    const hash = now.getUTCFullYear() * 10000 + now.getUTCMonth() * 100 + now.getUTCDate();
    return DAILY_IDEAS[hash % DAILY_IDEAS.length];
  }, []);

  return (
    <div className="glass-panel p-5 space-y-4">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-stroke text-xs font-black text-primary">ID</span>
        <h3 className="min-w-0 text-sm font-semibold text-fg-secondary text-wrap-balance">Workflow Idea</h3>
      </div>

      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
        <h4 className="mb-1 text-sm font-bold text-fg text-wrap-balance">{todayIdea.title}</h4>
        <p className="overflow-anywhere text-xs leading-relaxed text-fg-muted">{todayIdea.description}</p>
      </div>

      <button
        type="button"
        onClick={() => navigate("/app/workflows")}
        className="btn-ghost w-full py-2 text-xs font-bold"
      >
        Explore Workflows
      </button>
    </div>
  );
}
