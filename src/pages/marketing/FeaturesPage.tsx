import { Link } from "react-router-dom";
import SEO from "../../seo/SEO";

const features = [
  {
    title: "AI Workspace",
    description: "Test prompts, compare model behavior, organize context, and move useful AI output into projects and workflows.",
    href: "/docs/ai-workspace",
  },
  {
    title: "Provider Management",
    description: "Bring your own API keys and manage provider access through a shared vault without implying bundled model credits.",
    href: "/docs/ai-providers",
  },
  {
    title: "Projects and Tasks",
    description: "Connect AI work to project milestones, task ownership, meetings, daily updates, and team follow-through.",
    href: "/docs/projects-milestones",
  },
  {
    title: "Workflow Operations",
    description: "Turn repeatable prompts and process steps into reusable workflows that teams can inspect, refine, and share.",
    href: "/docs/ai-workflows",
  },
  {
    title: "Multimodal Workflows",
    description: "Plan text, image, video, and audio workflows while keeping provider capability and output expectations clear.",
    href: "/docs/multimodal-workflows",
  },
  {
    title: "Extension and Debugging",
    description: "Capture browser traffic, inspect provider traces, review streaming behavior, and replay useful debugging cases.",
    href: "/docs/extension-guide",
  },
];

export default function FeaturesPage() {
  return (
    <>
      <SEO
        title="Features"
        description="NodLync features for AI workspaces, provider orchestration, project management, workflows, collaboration, multimodal AI, and debugging."
        path="/features"
      />

      <div className="space-y-10">
        <div className="max-w-3xl space-y-4">
          <div className="text-sm font-bold uppercase tracking-[0.22em] text-primary">Platform features</div>
          <h1 className="text-4xl font-black leading-tight text-fg md:text-5xl">A cohesive operating layer for team AI work.</h1>
          <p className="text-lg leading-8 text-fg-secondary">
            NodLync helps teams connect their own providers, organize AI work into projects, build reusable workflows,
            collaborate around outputs, and debug requests when AI systems behave unexpectedly.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="rounded-lg border border-stroke bg-panel p-6">
              <h2 className="text-xl font-bold text-fg">{feature.title}</h2>
              <p className="mt-3 text-sm leading-6 text-fg-secondary">{feature.description}</p>
              <Link className="mt-5 inline-block text-sm font-semibold text-primary hover:underline" to={feature.href}>
                Learn more
              </Link>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-sky-400/30 bg-sky-400/10 p-5 text-sm leading-6 text-fg-secondary">
          NodLync is provider-agnostic. Your organization controls the provider accounts, API keys, model access, billing,
          usage limits, and approval rules. NodLync supplies the workspace, workflow, collaboration, and debugging layer.
        </div>
      </div>
    </>
  );
}
