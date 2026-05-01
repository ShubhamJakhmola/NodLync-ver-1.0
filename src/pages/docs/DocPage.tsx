import { Link, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import SEO from "../../seo/SEO";
import JsonLd from "../../seo/JsonLd";
import { faqSchema, techArticleSchema } from "../../seo/schema";
import { DOCS } from "../../content/registry";

function metricFaq(slug: string) {
  if (slug !== "performance-metrics") return null;
  return [
    { q: "What is TTFB?", a: "TTFB (Time To First Byte) is the time until the first byte of the response arrives from the server." },
    { q: "What is DCL?", a: "DOMContentLoaded (DCL) is fired when the initial HTML is parsed and the DOM is built." },
    { q: "What is TBT?", a: "Total Blocking Time (TBT) is the total time the main thread is blocked by long tasks, delaying input responsiveness." },
  ];
}

export default function DocPage() {
  const { slug = "" } = useParams();
  const doc = DOCS[slug];

  if (!doc) {
    return (
      <div className="space-y-3">
        <SEO title="Doc not found" description="The requested documentation page does not exist." path={`/docs/${slug}`} noindex />
        <h1 className="text-2xl font-bold">Doc not found</h1>
        <p className="text-fg-secondary">
          Try the <Link className="text-primary hover:underline" to="/docs">docs hub</Link>.
        </p>
      </div>
    );
  }

  const path = `/docs/${doc.slug}`;
  const faq = metricFaq(doc.slug);

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_280px]">
      <article className="prose prose-invert max-w-none">
        <SEO title={doc.title} description={doc.description} path={path} ogType="article" />
        <JsonLd
          data={techArticleSchema({
            headline: doc.title,
            description: doc.description,
            path,
          })}
        />
        {faq && <JsonLd data={faqSchema({ path, questions: faq })} />}

        <ReactMarkdown remarkPlugins={[remarkGfm]}>{doc.body}</ReactMarkdown>

        <div className="mt-10 border-t border-stroke/60 pt-6">
          <div className="text-sm font-semibold">Next step</div>
          <div className="text-sm text-fg-secondary mt-1">
            Ready to capture these metrics? Follow the <Link className="text-primary hover:underline" to="/docs/setup-guide">setup guide</Link>.
          </div>
        </div>
      </article>

      <aside className="space-y-4">
        <div className="glass-panel p-5 space-y-2">
          <div className="text-sm font-semibold">Popular docs</div>
          <div className="flex flex-col gap-2 text-sm">
            <Link className="text-primary hover:underline" to="/docs/performance-metrics">
              Performance metrics
            </Link>
            <Link className="text-primary hover:underline" to="/docs/api-monitoring">
              API monitoring
            </Link>
            <Link className="text-primary hover:underline" to="/docs/troubleshooting">
              Troubleshooting
            </Link>
          </div>
        </div>

        <div className="glass-panel p-5 space-y-2">
          <div className="text-sm font-semibold">CTA</div>
          <div className="text-sm text-fg-secondary">Install the extension and start debugging flows end-to-end.</div>
          <Link to="/docs/setup-guide" className="btn-primary w-full text-center mt-2 py-2 text-sm block">
            Install / Setup
          </Link>
        </div>
      </aside>
    </div>
  );
}

