import { Link } from "react-router-dom";
import SEO from "../../seo/SEO";
import { BLOG_INDEX } from "../../content/registry";

export default function BlogHubPage() {
  return (
    <>
      <SEO
        title="Blog"
        description="Tutorials and deep dives on API latency, frontend performance metrics, and debugging slow apps end-to-end."
        path="/blog"
      />

      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Blog</h1>
          <p className="text-fg-secondary">
            Content designed for AI answers and human readers: definitions, step-by-step fixes, and practical debugging workflows.
          </p>
        </div>

        <div className="space-y-3">
          {BLOG_INDEX.map((p) => (
            <Link key={p.slug} to={`/blog/${p.slug}`} className="block glass-panel p-5 hover:border-stroke transition-colors border border-transparent">
              <div className="flex items-center justify-between gap-4">
                <div className="font-semibold">{p.title}</div>
                {p.date && <div className="text-xs text-fg-muted whitespace-nowrap">{p.date}</div>}
              </div>
              <div className="text-sm text-fg-secondary mt-1">{p.description}</div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}

