import { Link, useParams } from "react-router-dom";
import SEO from "../../seo/SEO";
import JsonLd from "../../seo/JsonLd";
import { faqSchema, techArticleSchema } from "../../seo/schema";

const METRICS: Record<
  string,
  { name: string; description: string; why: string[]; how: string[]; fixes: string[]; synonyms?: string[] }
> = {
  ttfb: {
    name: "TTFB (Time To First Byte)",
    description: "TTFB is the time until the first byte of the server response arrives in the browser.",
    why: [
      "High TTFB often indicates backend latency, cold starts, or network issues.",
      "TTFB influences perceived speed and can delay rendering for server-rendered content.",
    ],
    how: [
      "NodLync captures request timing signals from the browser session and correlates them with API calls.",
      "Use session context to see which endpoints and flows drive high TTFB.",
    ],
    fixes: ["Add caching (CDN/server)", "Optimize DB queries and indexes", "Reduce upstream dependency latency", "Warm up cold starts"],
    synonyms: ["time to first byte"],
  },
  dcl: {
    name: "DCL (DOMContentLoaded)",
    description: "DOMContentLoaded (DCL) fires when the initial HTML is parsed and the DOM is constructed.",
    why: ["Slow DCL usually means heavy scripts and render-blocking resources.", "It’s a strong signal for frontend startup cost."],
    how: [
      "NodLync reads navigation timing metrics and associates them with the active flow.",
      "Compare DCL across releases to catch regressions in bundle size or blocking scripts.",
    ],
    fixes: ["Split bundles and lazy-load routes", "Defer non-critical scripts", "Reduce third-party script cost", "Avoid synchronous hydration hotspots"],
    synonyms: ["domcontentloaded"],
  },
  tbt: {
    name: "TBT (Total Blocking Time)",
    description: "Total Blocking Time (TBT) is the total time the main thread is blocked by long tasks, delaying user input.",
    why: ["TBT correlates strongly with real responsiveness problems.", "High TBT often comes from heavy JS and expensive rendering."],
    how: [
      "NodLync highlights sessions where blocking work increases and correlates it with network and UI timing.",
      "Use it to prioritize performance work that improves perceived interactivity.",
    ],
    fixes: ["Fix long tasks", "Move heavy work off the main thread (Web Workers)", "Reduce React re-renders", "Trim dependencies and ship less JS"],
    synonyms: ["total blocking time"],
  },
  lcp: {
    name: "LCP (Largest Contentful Paint)",
    description: "Largest Contentful Paint (LCP) measures when the largest visible element is rendered.",
    why: ["LCP represents perceived load completion.", "Poor LCP is often driven by image/font/critical resource delays."],
    how: [
      "NodLync captures LCP from browser performance APIs and compares it across flows.",
      "Correlate LCP with API latency to see whether server delay blocks render.",
    ],
    fixes: ["Optimize hero images", "Preload critical assets", "Reduce render-blocking resources", "Improve server response time for critical content"],
    synonyms: ["largest contentful paint"],
  },
};

function normalizeMetric(raw: string) {
  const m = raw.trim().toLowerCase();
  if (METRICS[m]) return m;
  const found = Object.entries(METRICS).find(([, v]) => v.synonyms?.includes(m));
  return found?.[0] ?? "";
}

export default function MetricPage() {
  const { metric = "" } = useParams();
  const key = normalizeMetric(metric);
  const data = METRICS[key];

  const path = `/docs/metrics/${metric}`;
  const title = data ? `How to measure ${key.toUpperCase()} in Chrome` : "Metric not found";

  if (!data) {
    return (
      <div className="space-y-3">
        <SEO title={title} description="This metric page does not exist." path={path} noindex />
        <h1 className="text-2xl font-bold">Metric not found</h1>
        <p className="text-fg-secondary">
          Try the <Link className="text-primary hover:underline" to="/docs/performance-metrics">performance metrics</Link>{" "}
          overview.
        </p>
      </div>
    );
  }

  const faq = [
    { q: `What is ${key.toUpperCase()}?`, a: data.description },
    { q: `How does NodLync measure ${key.toUpperCase()}?`, a: data.how[0] ?? "" },
    { q: `How do I fix high ${key.toUpperCase()}?`, a: data.fixes.join("; ") },
  ];

  return (
    <div className="prose prose-invert max-w-none">
      <SEO title={title} description={data.description} path={path} ogType="article" />
      <JsonLd data={techArticleSchema({ headline: title, description: data.description, path })} />
      <JsonLd data={faqSchema({ path, questions: faq })} />

      <h1>{data.name}</h1>

      <h2>What is {key.toUpperCase()}?</h2>
      <p>{data.description}</p>

      <h2>Why it matters</h2>
      <ul>
        {data.why.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>

      <h2>How NodLync measures it</h2>
      <ul>
        {data.how.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>

      <h2>How to fix high {key.toUpperCase()}</h2>
      <ul>
        {data.fixes.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>

      <h2>Next step</h2>
      <p>
        Follow the <Link to="/docs/setup-guide">setup guide</Link>, then use NodLync to correlate {key.toUpperCase()} with API latency in a real user flow.
      </p>
    </div>
  );
}

