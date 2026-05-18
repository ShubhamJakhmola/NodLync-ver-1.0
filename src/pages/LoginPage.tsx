import LoginForm from "../modules/auth/LoginForm";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAppStore from "../store/useAppStore";
import { useSeo } from "../hooks/useSeo";

const productNotes = [
  {
    marker: "WF",
    title: "Unified Workflow Builder",
    desc: "Design repeatable AI and productivity flows around your team's own provider accounts.",
  },
  {
    marker: "KEY",
    title: "Secure API Vault",
    desc: "Centralized management for provider keys and sensitive connection values.",
  },
  {
    marker: "OPS",
    title: "Project Operations",
    desc: "Integrated project tracking, meetings, tasks, and reviewed AI outputs.",
  },
];

const faqs = [
  {
    q: "Is my data used for training?",
    a: "No. NodLync does not use your private project data, prompts, or API keys for model training.",
  },
  {
    q: "Can I connect multiple AI providers?",
    a: "Yes. NodLync helps organize provider keys and model choices while your team controls the provider accounts and billing.",
  },
  {
    q: "Does NodLync include model credits?",
    a: "No bundled proprietary model credits are implied. Bring your approved API keys and use the providers your team trusts.",
  },
];

const LoginPage = () => {
  const user = useAppStore((s) => s.user);
  const navigate = useNavigate();

  useSeo(
    "AI Operating Workspace",
    "Sign in to NodLync, the provider-agnostic workspace for AI projects, API keys, workflows, collaboration, and debugging."
  );

  useEffect(() => {
    if (user) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  if (user) return null;
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-8 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-accent/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="z-10 w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-start mt-8 lg:mt-0">
        <div className="hidden lg:flex flex-col space-y-10 pr-8">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16">
                <img src="/favicon.svg" alt="NodLync Logo" className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(56,189,248,0.8)]" />
              </div>
              <h1 className="text-5xl font-black tracking-tight text-fg">NodLync</h1>
            </div>
            <p className="text-2xl font-bold text-fg-secondary leading-tight text-balance">
              The operating workspace for <span className="text-primary italic">AI-driven teams</span>.
            </p>
            <div className="h-1 w-24 bg-primary/30 rounded-full" />
          </div>

          <div className="grid gap-6">
            {productNotes.map((feature) => (
              <div key={feature.title} className="glass-panel p-5 flex gap-4 hover:border-primary/40 transition-colors group">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-xs font-black text-primary transition group-hover:border-primary/60">
                  {feature.marker}
                </div>
                <div>
                  <h3 className="font-bold text-fg-secondary">{feature.title}</h3>
                  <p className="text-sm text-fg-muted leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-6 pt-6">
            <h2 className="text-xl font-bold text-fg">Common Questions</h2>
            <div className="space-y-4">
              {faqs.map((faq) => (
                <div key={faq.q} className="space-y-1">
                  <h4 className="text-sm font-bold text-primary italic">Q: {faq.q}</h4>
                  <p className="text-xs text-fg-muted leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center lg:pt-20">
          <div className="lg:hidden mb-10 flex flex-col items-center gap-4">
            <div className="w-16 h-16">
              <img src="/favicon.svg" alt="NodLync Logo" className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(56,189,248,0.8)]" />
            </div>
            <h1 className="text-4xl font-bold tracking-wider text-fg">NodLync</h1>
          </div>

          <div className="w-full max-w-md">
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
