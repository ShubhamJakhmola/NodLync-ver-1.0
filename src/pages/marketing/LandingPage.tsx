import { Link } from "react-router-dom";
import SEO from "../../seo/SEO";
import JsonLd from "../../seo/JsonLd";
import { softwareApplicationSchema } from "../../seo/schema";

export default function LandingPage() {
  return (
    <>
      <SEO
        title="API + Frontend Performance Monitoring"
        description="Correlate API latency with frontend performance metrics (TTFB, DCL, TBT, LCP). Debug slow experiences with developer-first insights."
        path="/"
      />
      <JsonLd data={softwareApplicationSchema()} />

      <div className="grid gap-10 md:grid-cols-2 md:items-center">
        <div className="space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold leading-tight">
            Monitor API latency and frontend performance together
          </h1>
          <p className="text-lg text-fg-secondary">
            NodLync correlates API timings with UX metrics like TTFB, DOMContentLoaded, Total Blocking Time,
            and LCP—so you can fix what actually makes the app feel slow.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link to="/features" className="btn-primary px-5 py-3">
              Explore features
            </Link>
            <Link to="/docs/setup-guide" className="btn-ghost px-5 py-3">
              Setup guide
            </Link>
          </div>

          <div className="pt-4 grid grid-cols-2 gap-4 text-sm">
            <div className="glass-panel p-4">
              <div className="font-semibold">Chrome extension workflow</div>
              <div className="text-fg-secondary">Capture metrics where users experience them.</div>
            </div>
            <div className="glass-panel p-4">
              <div className="font-semibold">API + UX correlation</div>
              <div className="text-fg-secondary">Connect slow endpoints to real user impact.</div>
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 md:p-8 space-y-4">
          <div className="text-sm text-fg-muted">Common questions NodLync answers</div>
          <ul className="list-disc pl-5 space-y-2 text-fg-secondary">
            <li>Is the experience slow because of the backend or the frontend?</li>
            <li>Which API calls correlate with worse TTFB and LCP?</li>
            <li>What changed in the last deploy that increased TBT?</li>
          </ul>
          <div className="pt-4 border-t border-stroke/60">
            <div className="text-sm font-semibold">Get started</div>
            <div className="text-sm text-fg-secondary">
              Start with the <Link className="text-primary hover:underline" to="/docs/performance-metrics">performance metrics</Link>{" "}
              overview, then follow the <Link className="text-primary hover:underline" to="/docs/setup-guide">setup guide</Link>.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

