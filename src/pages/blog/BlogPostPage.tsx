import { Link, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import SEO from "../../seo/SEO";
import JsonLd from "../../seo/JsonLd";
import { techArticleSchema } from "../../seo/schema";
import { BLOG } from "../../content/registry";

export default function BlogPostPage() {
  const { slug = "" } = useParams();
  const post = BLOG[slug];

  if (!post) {
    return (
      <div className="space-y-3">
        <SEO title="Post not found" description="The requested blog post does not exist." path={`/blog/${slug}`} noindex />
        <h1 className="text-2xl font-bold">Post not found</h1>
        <p className="text-fg-secondary">
          Go back to the <Link className="text-primary hover:underline" to="/blog">blog</Link>.
        </p>
      </div>
    );
  }

  const path = `/blog/${post.slug}`;

  return (
    <article className="prose prose-invert max-w-none">
      <SEO
        title={post.title}
        description={post.description}
        path={path}
        ogType="article"
        publishedTime={post.date}
        modifiedTime={post.date}
      />
      <JsonLd
        data={techArticleSchema({
          headline: post.title,
          description: post.description,
          path,
          datePublished: post.date,
          dateModified: post.date,
        })}
      />

      {post.date && <div className="text-sm text-fg-muted mb-4">Published {post.date}</div>}
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.body}</ReactMarkdown>

      <div className="mt-10 border-t border-stroke/60 pt-6">
        <div className="text-sm font-semibold">CTA</div>
        <div className="text-sm text-fg-secondary mt-1">
          Want to correlate API latency with frontend metrics in one workflow? Start with the{" "}
          <Link className="text-primary hover:underline" to="/docs/setup-guide">
            NodLync setup guide
          </Link>
          .
        </div>
      </div>
    </article>
  );
}

