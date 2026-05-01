import { Link, useParams } from "react-router-dom";
import SEO from "../../seo/SEO";
import JsonLd from "../../seo/JsonLd";
import { faqSchema, techArticleSchema } from "../../seo/schema";

const ERRORS: Record<
  string,
  { title: string; description: string; symptoms: string[]; causes: string[]; fixes: string[] }
> = {
  "slow-api-response": {
    title: "Slow API response: how to find and fix it",
    description: "A practical checklist to diagnose slow API responses and verify improvements using correlated frontend + backend signals.",
    symptoms: ["High p95/p99 latency", "Spiky TTFB", "Slow pages even with optimized UI"],
    causes: ["Database hotspots", "Upstream dependency latency", "Cold starts", "Large payloads"],
    fixes: ["Add caching", "Optimize queries and indexes", "Add timeouts + retries with backoff", "Reduce payload size", "Instrument and compare p95 over time"],
  },
  "rls-policy-error": {
    title: "RLS policy error: how to diagnose and fix",
    description: "Steps to fix common row-level security (RLS) policy errors and ensure requests succeed consistently.",
    symptoms: ["401/403 responses", "Works in SQL editor but fails in app", "Requests fail only for some users"],
    causes: ["Missing policy for role", "Incorrect auth context", "Policy conditions not matching data"],
    fixes: ["Confirm JWT claims", "Add explicit SELECT/INSERT/UPDATE policies", "Test with real user tokens", "Verify table ownership and role grants"],
  },
};

export default function ErrorPage() {
  const { type = "" } = useParams();
  const data = ERRORS[type];
  const path = `/docs/errors/${type}`;

  if (!data) {
    return (
      <div className="space-y-3">
        <SEO title="Error page not found" description="This error troubleshooting page does not exist." path={path} noindex />
        <h1 className="text-2xl font-bold">Not found</h1>
        <p className="text-fg-secondary">
          Go to the <Link className="text-primary hover:underline" to="/docs">docs hub</Link>.
        </p>
      </div>
    );
  }

  const faq = [
    { q: "What does this error mean?", a: data.description },
    { q: "What are common causes?", a: data.causes.join("; ") },
    { q: "How do I fix it?", a: data.fixes.join("; ") },
  ];

  return (
    <div className="prose prose-invert max-w-none">
      <SEO title={data.title} description={data.description} path={path} ogType="article" />
      <JsonLd data={techArticleSchema({ headline: data.title, description: data.description, path })} />
      <JsonLd data={faqSchema({ path, questions: faq })} />

      <h1>{data.title}</h1>
      <p>{data.description}</p>

      <h2>Symptoms</h2>
      <ul>
        {data.symptoms.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>

      <h2>Common causes</h2>
      <ul>
        {data.causes.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>

      <h2>Fix checklist</h2>
      <ul>
        {data.fixes.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>

      <h2>Related</h2>
      <ul>
        <li>
          <Link to="/docs/api-monitoring">API monitoring</Link>
        </li>
        <li>
          <Link to="/docs/performance-metrics">Performance metrics</Link>
        </li>
      </ul>
    </div>
  );
}

