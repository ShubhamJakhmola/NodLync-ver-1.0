import { Link } from "react-router-dom";
import SEO from "../../seo/SEO";
import { DOC_INDEX } from "../../content/registry";

export default function DocsHubPage() {
  return (
    <>
      <SEO
        title="Documentation"
        description="Developer docs for NodLync: performance metrics, API monitoring, setup, and troubleshooting."
        path="/docs"
      />

      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Documentation</h1>
          <p className="text-fg-secondary">
            Each page targets a specific debugging problem keyword and gives an explanation, use case, example, and solution.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {DOC_INDEX.map((d) => (
            <Link key={d.slug} to={`/docs/${d.slug}`} className="glass-panel p-5 hover:border-stroke transition-colors border border-transparent">
              <div className="font-semibold">{d.title}</div>
              <div className="text-sm text-fg-secondary mt-1">{d.description}</div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}

