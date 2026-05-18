import { Link } from "react-router-dom";
import SEO from "../../seo/SEO";
import { BLOG_INDEX } from "../../content/registry";

export default function BlogHubPage() {
  return (
    <>
      <SEO
        title="Blog"
        description="NodLync notes on AI workflows, provider operations, project systems, collaboration, performance, and debugging."
        path="/blog"
      />

      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Blog</h1>
          <p className="text-fg-secondary">
            Practical notes for teams building AI workflows, connecting providers, organizing projects, and debugging real behavior.
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
