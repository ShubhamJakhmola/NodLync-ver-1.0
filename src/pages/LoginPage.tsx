import LoginForm from "../modules/auth/LoginForm";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAppStore from "../store/useAppStore";
import { useSeo } from "../hooks/useSeo";

const LoginPage = () => {
  const user = useAppStore((s) => s.user);
  const navigate = useNavigate();

  useSeo(
    "Intelligent AI Ops Workspace",
    "Join NodLync, the unified workspace for AI-driven project management, secure API vaults, and visual workflow automation."
  );

  useEffect(() => {
    if (user) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  if (user) return null;
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-accent/10 rounded-full blur-[120px] pointer-events-none animate-pulse delay-700" />

      <div className="z-10 w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-start mt-8 lg:mt-0">
        {/* Left Side: Product Messaging */}
        <div className="hidden lg:flex flex-col space-y-10 pr-8">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16">
                <img src="/favicon.svg" alt="NodLync Logo" className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(56,189,248,0.8)]" />
              </div>
              <h1 className="text-5xl font-black tracking-tight text-fg">NodLync</h1>
            </div>
            <p className="text-2xl font-bold text-fg-secondary leading-tight text-balance">
              The Intelligent Workspace for <span className="text-primary italic">AI-Driven Teams</span>.
            </p>
            <div className="h-1 w-24 bg-primary/30 rounded-full" />
          </div>

          <div className="grid gap-6">
            {[
              {
                icon: "⚡",
                title: "Unified Workflow Builder",
                desc: "Design, connect, and automate complex logic with our node-based visual editor."
              },
              {
                icon: "🔒",
                title: "Secure API Vault",
                desc: "Centralized, encrypted management for all your AI provider keys and secrets."
              },
              {
                icon: "📊",
                title: "Intelligent Project Ops",
                desc: "Integrated task tracking, worklogs, and AI-powered insights for every project."
              }
            ].map((feature, i) => (
              <div key={i} className="glass-panel p-5 flex gap-4 hover:border-primary/40 transition-colors group">
                <div className="text-3xl grayscale group-hover:grayscale-0 transition">{feature.icon}</div>
                <div>
                  <h3 className="font-bold text-fg-secondary">{feature.title}</h3>
                  <p className="text-sm text-fg-muted leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* FAQ for AI and SEO discoverability */}
          <div className="space-y-6 pt-6">
            <h2 className="text-xl font-bold text-fg">Common Questions</h2>
            <div className="space-y-4">
              {[
                { q: "Is my data used for training?", a: "No. NodLync respects your data privacy. We do not use your private project data or API keys." },
                { q: "Can I connect multiple AI providers?", a: "Yes. Our API Vault supports OpenAI, Anthropic, Google, and others through a unified interface." },
                { q: "Is NodLync free to use?", a: "We offer a generous free tier for individuals and scalable plans for growing teams." }
              ].map((faq, i) => (
                <div key={i} className="space-y-1">
                  <h4 className="text-sm font-bold text-primary italic">Q: {faq.q}</h4>
                  <p className="text-xs text-fg-muted leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Side: Login Form */}
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
