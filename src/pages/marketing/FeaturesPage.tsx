import { Link } from "react-router-dom";
import SEO from "../../seo/SEO";

export default function FeaturesPage() {
  return (
    <>
      <SEO
        title="Features"
        description="API monitoring, frontend performance metrics, AI analysis, and correlation workflows to debug slow apps end-to-end."
        path="/features"
      />

      <div className="space-y-10">
        <div className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-bold">Features built for debugging slow apps</h1>
          <p className="text-fg-secondary">
            NodLync is an AI ops monitoring tool for developers: it connects backend latency with frontend performance signals.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="glass-panel p-6 space-y-2">
            <h2 className="text-xl font-semibold">API performance monitoring</h2>
            <p className="text-fg-secondary">
              Track latency and errors, and see which endpoints correlate with real UX slowdowns.
            </p>
            <Link className="text-primary hover:underline text-sm" to="/docs/api-monitoring">
              Read API monitoring docs →
            </Link>
          </div>

          <div className="glass-panel p-6 space-y-2">
            <h2 className="text-xl font-semibold">Frontend performance metrics</h2>
            <p className="text-fg-secondary">
              Capture TTFB, DCL, TBT, and LCP from the browser and compare across builds.
            </p>
            <Link className="text-primary hover:underline text-sm" to="/docs/performance-metrics">
              Learn the metrics →
            </Link>
          </div>

          <div className="glass-panel p-6 space-y-2">
            <h2 className="text-xl font-semibold">AI-assisted insights</h2>
            <p className="text-fg-secondary">
              Get structured explanations for why a flow is slow and what to fix first (no fluff, dev-first).
            </p>
            <Link className="text-primary hover:underline text-sm" to="/docs/troubleshooting">
              Troubleshoot common issues →
            </Link>
          </div>

          <div className="glass-panel p-6 space-y-2">
            <h2 className="text-xl font-semibold">Conversion-focused CTAs</h2>
            <p className="text-fg-secondary">
              Every doc and article includes a next step: install, setup, or diagnose a specific metric.
            </p>
            <Link className="text-primary hover:underline text-sm" to="/docs/setup-guide">
              Setup guide →
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

