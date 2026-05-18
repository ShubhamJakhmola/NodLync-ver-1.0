import { Link, useParams } from "react-router-dom";
import SEO from "../../seo/SEO";
import JsonLd from "../../seo/JsonLd";
import { techArticleSchema } from "../../seo/schema";
import { DOC_CATEGORIES, DOCS_BY_SLUG, getDocsByCategory, getRelatedDocs, type DocSection } from "../../content/docsKnowledge";

function sectionId(heading: string) {
  return heading.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function Callout({ title, items, tone = "note" }: { title: string; items?: string[]; tone?: "note" | "warning" | "fix" }) {
  if (!items?.length) return null;

  const toneClass =
    tone === "warning"
      ? "border-amber-400/40 bg-amber-400/10"
      : tone === "fix"
        ? "border-emerald-400/40 bg-emerald-400/10"
        : "border-sky-400/40 bg-sky-400/10";

  return (
    <div className={`mt-5 rounded-lg border p-4 ${toneClass}`}>
      <div className="text-sm font-bold text-fg">{title}</div>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-fg-secondary">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Steps({ steps }: { steps?: string[] }) {
  if (!steps?.length) return null;

  return (
    <ol className="mt-5 space-y-3">
      {steps.map((step, index) => (
        <li key={step} className="grid grid-cols-[32px_1fr] gap-3 rounded-lg border border-stroke bg-panel p-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-black text-on-primary">
            {index + 1}
          </span>
          <span className="pt-1 text-sm leading-6 text-fg-secondary">{step}</span>
        </li>
      ))}
    </ol>
  );
}

function SectionBlock({ section }: { section: DocSection }) {
  return (
    <section id={sectionId(section.heading)} className="scroll-mt-24 border-t border-stroke/70 pt-8 first:border-t-0 first:pt-0">
      <h2 className="text-2xl font-bold text-fg">{section.heading}</h2>
      <div className="mt-4 space-y-4">
        {section.body.map((paragraph) => (
          <p key={paragraph} className="text-base leading-8 text-fg-secondary">
            {paragraph}
          </p>
        ))}
      </div>

      {section.bullets?.length ? (
        <ul className="mt-5 grid gap-3 md:grid-cols-2">
          {section.bullets.map((bullet) => (
            <li key={bullet} className="rounded-lg border border-stroke bg-panel p-4 text-sm leading-6 text-fg-secondary">
              {bullet}
            </li>
          ))}
        </ul>
      ) : null}

      <Steps steps={section.steps} />
      <Callout title="Common mistakes" items={section.mistakes} tone="warning" />
      <Callout title="Troubleshooting" items={section.troubleshooting} tone="fix" />
    </section>
  );
}

export default function DocPage() {
  const { slug = "" } = useParams();
  const doc = DOCS_BY_SLUG[slug];

  if (!doc) {
    return (
      <div className="mx-auto max-w-3xl space-y-3">
        <SEO title="Doc not found" description="The requested documentation page does not exist." path={`/docs/${slug}`} noindex />
        <h1 className="text-2xl font-bold">Doc not found</h1>
        <p className="text-fg-secondary">
          Try the <Link className="text-primary hover:underline" to="/docs">docs hub</Link>.
        </p>
      </div>
    );
  }

  const related = getRelatedDocs(doc);
  const categoryDocs = getDocsByCategory(doc.category);
  const path = `/docs/${doc.slug}`;

  return (
    <>
      <SEO title={doc.title} description={doc.description} path={path} ogType="article" />
      <JsonLd data={techArticleSchema({ headline: doc.title, description: doc.description, path })} />

      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[260px_1fr_280px]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-4">
            <div className="rounded-lg border border-stroke bg-panel p-4">
              <div className="text-sm font-semibold text-fg">Documentation</div>
              <div className="mt-3 flex flex-col gap-2 text-sm">
                {DOC_CATEGORIES.map((category) => (
                  <Link
                    key={category}
                    to={`/docs#${category.replaceAll(" ", "-").toLowerCase()}`}
                    className={category === doc.category ? "font-semibold text-primary" : "text-fg-secondary hover:text-primary"}
                  >
                    {category}
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-stroke bg-panel p-4">
              <div className="text-sm font-semibold text-fg">{doc.category}</div>
              <div className="mt-3 flex flex-col gap-2 text-sm">
                {categoryDocs.map((item) => (
                  <Link
                    key={item.slug}
                    to={`/docs/${item.slug}`}
                    className={item.slug === doc.slug ? "font-semibold text-primary" : "text-fg-secondary hover:text-primary"}
                  >
                    {item.title}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <article className="min-w-0">
          <nav className="mb-5 flex flex-wrap items-center gap-2 text-sm text-fg-muted">
            <Link to="/docs" className="hover:text-primary">Docs</Link>
            <span aria-hidden="true">/</span>
            <Link to={`/docs#${doc.category.replaceAll(" ", "-").toLowerCase()}`} className="hover:text-primary">{doc.category}</Link>
            <span aria-hidden="true">/</span>
            <span className="text-fg-secondary">{doc.title}</span>
          </nav>

          <header className="rounded-lg border border-stroke bg-panel p-6 md:p-8">
            <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
              <span>{doc.category}</span>
              <span aria-hidden="true">/</span>
              <span>{doc.audience}</span>
              <span aria-hidden="true">/</span>
              <span>{doc.time}</span>
            </div>
            <h1 className="mt-4 text-4xl font-black leading-tight text-fg">{doc.title}</h1>
            <p className="mt-4 text-lg leading-8 text-fg-secondary">{doc.description}</p>
            <div className="mt-6 rounded-lg border border-stroke bg-surface p-4">
              <div className="text-sm font-bold text-fg">You will learn</div>
              <ul className="mt-3 grid gap-2 text-sm text-fg-secondary md:grid-cols-2">
                {doc.learn.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </header>

          <div className="mt-8 space-y-10">
            {doc.sections.map((section) => (
              <SectionBlock key={section.heading} section={section} />
            ))}
          </div>

          {related.length > 0 && (
            <section className="mt-12 border-t border-stroke pt-8">
              <h2 className="text-2xl font-bold text-fg">Related Guides</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {related.map((item) => (
                  <Link key={item.slug} to={`/docs/${item.slug}`} className="rounded-lg border border-stroke bg-panel p-4 hover:border-primary/70">
                    <div className="font-semibold text-fg">{item.title}</div>
                    <p className="mt-2 text-sm leading-6 text-fg-secondary">{item.description}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </article>

        <aside className="hidden xl:block">
          <div className="sticky top-24 space-y-4">
            <div className="rounded-lg border border-stroke bg-panel p-4">
              <div className="text-sm font-semibold text-fg">On This Page</div>
              <div className="mt-3 flex flex-col gap-2 text-sm">
                {doc.sections.map((section) => (
                  <a key={section.heading} href={`#${sectionId(section.heading)}`} className="text-fg-secondary hover:text-primary">
                    {section.heading}
                  </a>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-stroke bg-panel p-4">
              <div className="text-sm font-semibold text-fg">Workflow Diagram</div>
              <div className="mt-4 space-y-2 text-sm text-fg-secondary">
                <div className="rounded-md border border-stroke bg-surface p-3">Input or question</div>
                <div className="text-center text-fg-muted">down</div>
                <div className="rounded-md border border-stroke bg-surface p-3">Provider and model</div>
                <div className="text-center text-fg-muted">down</div>
                <div className="rounded-md border border-stroke bg-surface p-3">Response, trace, or output</div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
