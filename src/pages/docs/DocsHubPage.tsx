import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import SEO from "../../seo/SEO";
import { DOC_CATEGORIES, getDocsByCategory, KNOWLEDGE_DOCS } from "../../content/docsKnowledge";

function matchesQuery(text: string, query: string) {
  return text.toLowerCase().includes(query.trim().toLowerCase());
}

export default function DocsHubPage() {
  const [query, setQuery] = useState("");

  const featured = ["getting-started", "beginner-guide", "ai-providers", "extension-guide", "troubleshooting"]
    .map((slug) => KNOWLEDGE_DOCS.find((doc) => doc.slug === slug))
    .filter(Boolean);

  const visibleCategories = useMemo(() => {
    if (!query.trim()) return DOC_CATEGORIES.map((category) => ({ category, docs: getDocsByCategory(category) }));

    return DOC_CATEGORIES.map((category) => ({
      category,
      docs: getDocsByCategory(category).filter((doc) =>
        matchesQuery(
          `${doc.title} ${doc.description} ${doc.category} ${doc.audience} ${doc.learn.join(" ")} ${doc.sections
            .map((section) => `${section.heading} ${section.body.join(" ")} ${(section.bullets ?? []).join(" ")}`)
            .join(" ")}`,
          query
        )
      ),
    })).filter((group) => group.docs.length > 0);
  }, [query]);

  return (
    <>
      <SEO
        title="NodLync Documentation"
        description="Beginner-friendly NodLync documentation for AI workspaces, projects, providers, workflows, collaboration, extension capture, and debugging."
        path="/docs"
      />

      <div className="mx-auto max-w-7xl space-y-8">
        <section className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-end">
          <div className="space-y-4">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Knowledge platform</div>
            <h1 className="max-w-3xl text-4xl font-black leading-tight text-fg md:text-5xl">
              Learn NodLync from first principles.
            </h1>
            <p className="max-w-3xl text-lg leading-8 text-fg-secondary">
              Clear guides for the AI workspace, projects, tasks, providers, models, workflows, collaboration, extension capture,
              and debugging. Start as a beginner and grow into advanced workflows at your own pace.
            </p>
          </div>

          <div className="rounded-lg border border-stroke bg-panel p-4">
            <label className="text-sm font-semibold text-fg" htmlFor="docs-search">
              Search documentation
            </label>
            <input
              id="docs-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Try providers, streaming, tasks, API keys..."
              className="mt-3 w-full rounded-lg px-4 py-3 text-sm"
            />
            <p className="mt-3 text-sm text-fg-muted">
              Searches titles, explanations, examples, and troubleshooting notes.
            </p>
          </div>
        </section>

        {!query.trim() && (
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {featured.map((doc) => (
              <Link
                key={doc!.slug}
                to={`/docs/${doc!.slug}`}
                className="rounded-lg border border-stroke bg-panel p-4 transition hover:border-primary/70 hover:bg-surface"
              >
                <div className="text-xs font-semibold uppercase tracking-wider text-primary">{doc!.category}</div>
                <div className="mt-2 font-bold text-fg">{doc!.title}</div>
                <div className="mt-2 text-sm leading-6 text-fg-secondary">{doc!.description}</div>
              </Link>
            ))}
          </section>
        )}

        <section className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-lg border border-stroke bg-panel p-4">
              <div className="text-sm font-semibold text-fg">Sections</div>
              <div className="mt-3 flex flex-col gap-2 text-sm">
                {DOC_CATEGORIES.map((category) => (
                  <a key={category} href={`#${category.replaceAll(" ", "-").toLowerCase()}`} className="text-fg-secondary hover:text-primary">
                    {category}
                  </a>
                ))}
              </div>
            </div>
          </aside>

          <div className="space-y-8">
            {visibleCategories.length === 0 && (
              <div className="rounded-lg border border-stroke bg-panel p-6">
                <div className="font-semibold text-fg">No guides found</div>
                <p className="mt-2 text-sm text-fg-secondary">Try a broader search such as AI, provider, task, capture, or key.</p>
              </div>
            )}

            {visibleCategories.map(({ category, docs }) => (
              <section key={category} id={category.replaceAll(" ", "-").toLowerCase()} className="space-y-3 scroll-mt-24">
                <div>
                  <h2 className="text-2xl font-bold text-fg">{category}</h2>
                  <p className="mt-1 text-sm text-fg-muted">{docs.length} guide{docs.length === 1 ? "" : "s"}</p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {docs.map((doc) => (
                    <Link
                      key={doc.slug}
                      to={`/docs/${doc.slug}`}
                      className="rounded-lg border border-stroke bg-panel p-5 transition hover:border-primary/70 hover:bg-surface"
                    >
                      <div className="flex flex-wrap items-center gap-2 text-xs text-fg-muted">
                        <span>{doc.audience}</span>
                        <span aria-hidden="true">/</span>
                        <span>{doc.time}</span>
                      </div>
                      <div className="mt-2 text-lg font-bold text-fg">{doc.title}</div>
                      <p className="mt-2 text-sm leading-6 text-fg-secondary">{doc.description}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {doc.learn.slice(0, 3).map((item) => (
                          <span key={item} className="rounded-md border border-stroke bg-surface px-2 py-1 text-xs text-fg-secondary">
                            {item}
                          </span>
                        ))}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
