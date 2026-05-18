import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import SEO from "../../seo/SEO";
import JsonLd from "../../seo/JsonLd";
import { softwareApplicationSchema } from "../../seo/schema";

const workspaceFlow = [
  { title: "Chat", detail: "Test prompts with your selected model.", marker: "01" },
  { title: "Research", detail: "Compare answers and synthesize findings.", marker: "02" },
  { title: "Multimodal", detail: "Plan text, image, audio, and video steps.", marker: "03" },
  { title: "Compare", detail: "Evaluate quality, speed, and fit.", marker: "04" },
];

const operatingFlow = [
  { title: "Projects", detail: "Create the shared home for AI work." },
  { title: "Milestones", detail: "Define visible checkpoints." },
  { title: "Tasks", detail: "Assign reviewed next steps." },
  { title: "Meetings", detail: "Keep decisions connected." },
];

const providerFlow = [
  { title: "API Vault", detail: "Store provider keys and sensitive connection values." },
  { title: "API Tester", detail: "Validate provider requests, payloads, responses, and streaming behavior." },
  { title: "Providers", detail: "Connect OpenAI, Anthropic, Gemini, Groq, Ollama, OpenRouter, and custom endpoints." },
  { title: "Routing", detail: "Choose the right model for each workflow without hiding ownership." },
];

const debugFlow = [
  "Traffic capture",
  "Provider trace",
  "Streaming inspection",
  "Replay case",
];

export default function LandingPage() {
  return (
    <>
      <SEO
        title="NodLync - AI Operating Workspace"
        description="A polished AI operating workspace for teams to connect their own providers, manage projects, build workflows, collaborate, and debug AI requests."
        path="/"
      />
      <JsonLd data={softwareApplicationSchema()} />

      <div className="landing-shell space-y-16 md:space-y-24">
        <section className="landing-hero relative overflow-hidden rounded-[28px] border border-stroke bg-panel px-5 py-8 shadow-2xl sm:px-8 md:py-12 lg:px-10">
          <div className="landing-grid" />
          <div className="landing-sheen" />

          <div className="relative grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div className="space-y-7">
              <div className="inline-flex max-w-full items-center gap-3 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary shadow-[0_0_40px_rgba(56,189,248,0.12)]">
                <span className="h-2 w-2 rounded-full bg-primary landing-pulse" />
                AI workspace for teams that bring their own providers
              </div>

              <div className="space-y-5">
                <h1 className="max-w-4xl text-4xl font-black leading-[1.04] tracking-normal text-fg sm:text-5xl lg:text-6xl">
                  Operate AI work from one connected workspace.
                </h1>
                <p className="max-w-2xl text-base leading-8 text-fg-secondary sm:text-lg">
                  NodLync connects projects, prompts, workflows, provider keys, collaboration, and request debugging into a
                  single operating layer. Your team owns the providers and usage. NodLync keeps the work organized.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link to="/app" className="btn-primary px-6 py-3 text-base font-bold landing-lift">
                  Launch Workspace
                </Link>
                <Link to="/docs/getting-started" className="btn-ghost px-6 py-3 text-base font-bold landing-lift">
                  Start With The Guide
                </Link>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Signal label="Ownership" value="Your keys" />
                <Signal label="Workspace" value="Projects + AI" />
                <Signal label="Operations" value="Traceable flows" />
              </div>
            </div>

            <HeroWorkspace />
          </div>
        </section>

        <ConnectedSection
          eyebrow="AI workspace"
          title="From prompt to reusable workflow."
          description="The AI surface is not an isolated chat box. It is the place where teams test ideas, compare providers, review outputs, and save what works."
        >
          <div className="landing-flow-grid">
            {workspaceFlow.map((item, index) => (
              <FlowNode key={item.title} item={item} index={index} />
            ))}
          </div>
        </ConnectedSection>

        <section className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr]">
          <div className="landing-sticky-copy">
            <SectionIntro
              eyebrow="Project operations"
              title="AI output gets a place to land."
              description="Projects, milestones, tasks, and meetings create the operating rhythm around AI work so useful output becomes visible progress."
            />
          </div>

          <div className="relative rounded-2xl border border-stroke bg-panel p-4 md:p-6">
            <div className="absolute left-8 top-10 hidden h-[calc(100%-5rem)] w-px bg-gradient-to-b from-primary/70 via-stroke to-transparent md:block" />
            <div className="space-y-4">
              {operatingFlow.map((item, index) => (
                <div key={item.title} className="relative grid gap-3 rounded-xl border border-stroke bg-surface/70 p-4 transition hover:border-primary/50 hover:bg-surface md:grid-cols-[52px_1fr]">
                  <div className="z-10 flex h-11 w-11 items-center justify-center rounded-xl border border-primary/30 bg-background text-sm font-black text-primary">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="font-bold text-fg">{item.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-fg-secondary">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <ConnectedSection
          eyebrow="Provider operations"
          title="Bring your provider stack into one operating layer."
          description="NodLync does not imply bundled model credits or proprietary hosted inference. It helps teams manage their own provider access, test requests, and choose models intentionally."
        >
          <div className="rounded-2xl border border-stroke bg-panel p-4 md:p-6">
            <div className="grid gap-3 lg:grid-cols-4">
              {providerFlow.map((item) => (
                <div key={item.title} className="landing-provider-card rounded-xl border border-stroke bg-surface p-4">
                  <h3 className="font-bold text-fg">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-fg-secondary">{item.detail}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {["OpenAI", "Anthropic", "Gemini", "Groq", "Ollama", "OpenRouter", "Replicate", "Custom"].map((provider) => (
                <span key={provider} className="rounded-full border border-stroke bg-background px-3 py-1.5 text-xs font-bold text-fg-secondary">
                  {provider}
                </span>
              ))}
            </div>
          </div>
        </ConnectedSection>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="landing-debug-panel rounded-2xl border border-stroke bg-panel p-6">
            <SectionIntro
              eyebrow="Debugging and inspection"
              title="When AI behaves strangely, inspect the path."
              description="Use extension capture and trace tooling to understand provider calls, streaming behavior, response shape, replay cases, and browser context."
            />
            <div className="mt-7 space-y-3">
              {debugFlow.map((item, index) => (
                <div key={item} className="flex items-center gap-3 rounded-xl border border-stroke bg-surface p-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-primary landing-pulse" style={{ animationDelay: `${index * 220}ms` }} />
                  <span className="text-sm font-semibold text-fg-secondary">{item}</span>
                </div>
              ))}
            </div>
            <Link to="/docs/extension-guide" className="mt-6 inline-block text-sm font-bold text-primary hover:underline">
              Read the extension guide
            </Link>
          </div>

          <div className="rounded-2xl border border-stroke bg-panel p-6">
            <SectionIntro
              eyebrow="Start small"
              title="A clear path for first-time users."
              description="The first session should feel guided: create a project, add one provider key, test one prompt, then turn the repeatable part into a workflow."
            />
            <ol className="mt-7 space-y-3">
              {["Create a project", "Add a provider key", "Test in AI Playground", "Save a workflow"].map((step, index) => (
                <li key={step} className="group grid grid-cols-[34px_1fr] gap-3 rounded-xl border border-stroke bg-surface p-3 transition hover:border-primary/50">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-black text-on-primary transition group-hover:scale-105">
                    {index + 1}
                  </span>
                  <span className="pt-1.5 text-sm font-semibold text-fg-secondary">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="relative overflow-hidden rounded-[28px] border border-stroke bg-panel p-8 text-center md:p-12">
          <div className="landing-sheen" />
          <div className="relative">
            <h2 className="mx-auto max-w-3xl text-3xl font-black leading-tight tracking-normal text-fg md:text-5xl">
              Build an AI workspace your team can actually operate.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-fg-secondary md:text-lg">
              Your providers, your keys, your projects, your workflows. NodLync gives the operating system around them.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/app" className="btn-primary px-7 py-3 text-base font-bold landing-lift">
                Open Workspace
              </Link>
              <Link to="/docs/what-is-nodlync" className="btn-ghost px-7 py-3 text-base font-bold landing-lift">
                What Is NodLync?
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

function HeroWorkspace() {
  return (
    <div className="landing-workspace relative mx-auto w-full max-w-[620px] rounded-[24px] border border-stroke bg-background/80 p-4 shadow-2xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-black text-fg">Live workspace route</div>
          <div className="text-xs text-fg-muted">Prompt to provider to project context</div>
        </div>
        <div className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300">
          Streaming
        </div>
      </div>

      <div className="relative min-h-[370px] overflow-hidden rounded-2xl border border-stroke bg-panel p-4">
        <svg className="landing-routes absolute inset-0 h-full w-full" viewBox="0 0 620 370" aria-hidden="true">
          <path d="M115 86 C210 55 250 185 340 154 S468 90 532 130" />
          <path d="M92 260 C190 210 260 290 348 238 S472 236 548 286" />
          <path d="M155 168 C250 150 292 72 398 88 S492 164 540 202" />
        </svg>

        <FloatingPanel className="left-3 top-4 w-[46%]" title="Project" label="Beta launch">
          <div className="mt-3 space-y-2">
            <Meter label="Milestones" width="72%" />
            <Meter label="Tasks reviewed" width="54%" />
          </div>
        </FloatingPanel>

        <FloatingPanel className="right-3 top-11 w-[42%] landing-float-delay" title="Provider route" label="Own API key">
          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-bold text-fg-muted">
            <span className="rounded-md bg-surface px-2 py-1">OpenAI</span>
            <span className="rounded-md bg-surface px-2 py-1">Gemini</span>
            <span className="rounded-md bg-surface px-2 py-1">Groq</span>
            <span className="rounded-md bg-surface px-2 py-1">Custom</span>
          </div>
        </FloatingPanel>

        <FloatingPanel className="left-[18%] top-[43%] w-[48%] landing-float-slow" title="AI response" label="Streaming summary">
          <div className="mt-3 space-y-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface">
              <div className="landing-typing h-full rounded-full bg-primary" />
            </div>
            <div className="h-2 w-4/5 rounded-full bg-primary/20" />
            <div className="h-2 w-2/3 rounded-full bg-primary/15" />
          </div>
        </FloatingPanel>

        <FloatingPanel className="bottom-4 right-5 w-[45%]" title="Trace" label="Request inspected">
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px] font-bold text-fg-muted">
            <span className="rounded-md bg-surface py-1">Key</span>
            <span className="rounded-md bg-surface py-1">Model</span>
            <span className="rounded-md bg-surface py-1">Stream</span>
          </div>
        </FloatingPanel>
      </div>
    </div>
  );
}

function FloatingPanel({ className, title, label, children }: { className: string; title: string; label: string; children: ReactNode }) {
  return (
    <div className={`landing-floating absolute rounded-2xl border border-stroke bg-background/90 p-4 shadow-xl backdrop-blur ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-black uppercase tracking-normal text-fg-muted">{title}</div>
        <div className="h-2 w-2 rounded-full bg-primary landing-pulse" />
      </div>
      <div className="mt-1 text-sm font-bold text-fg">{label}</div>
      {children}
    </div>
  );
}

function Meter({ label, width }: { label: string; width: string }) {
  return (
    <div>
      <div className="mb-1 text-[11px] font-semibold text-fg-muted">{label}</div>
      <div className="h-2 rounded-full bg-surface">
        <div className="h-full rounded-full bg-primary/70" style={{ width }} />
      </div>
    </div>
  );
}

function Signal({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-stroke bg-panel/70 p-4 backdrop-blur">
      <div className="text-[11px] font-bold uppercase tracking-normal text-fg-muted">{label}</div>
      <div className="mt-1 text-sm font-black text-fg">{value}</div>
    </div>
  );
}

function ConnectedSection({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: ReactNode }) {
  return (
    <section className="grid gap-7 lg:grid-cols-[0.72fr_1.28fr] lg:items-center">
      <SectionIntro eyebrow={eyebrow} title={title} description={description} />
      {children}
    </section>
  );
}

function SectionIntro({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="space-y-3">
      <div className="text-xs font-bold uppercase tracking-normal text-primary">{eyebrow}</div>
      <h2 className="max-w-xl text-3xl font-black leading-tight tracking-normal text-fg md:text-4xl">{title}</h2>
      <p className="max-w-2xl text-base leading-7 text-fg-secondary">{description}</p>
    </div>
  );
}

function FlowNode({ item, index }: { item: { title: string; detail: string; marker: string }; index: number }) {
  return (
    <div className="landing-flow-node group relative rounded-2xl border border-stroke bg-panel p-5 transition hover:border-primary/60 hover:bg-surface">
      {index < 3 ? <div className="landing-connector hidden lg:block" /> : null}
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-xs font-black text-primary">
        {item.marker}
      </div>
      <h3 className="mt-4 text-lg font-black text-fg">{item.title}</h3>
      <p className="mt-2 text-sm leading-6 text-fg-secondary">{item.detail}</p>
    </div>
  );
}
