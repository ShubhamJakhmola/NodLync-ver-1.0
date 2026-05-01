import { toMarkdownDoc, type MarkdownDoc } from "../utils/markdown";

type RawModule = { default: string };

const docsRaw = import.meta.glob<RawModule>("./docs/**/*.md", { query: "?raw", eager: true });
const blogRaw = import.meta.glob<RawModule>("./blog/**/*.md", { query: "?raw", eager: true });

function pathToSlug(p: string) {
  return p
    .replace(/^\.\/(docs|blog)\//, "")
    .replace(/\.md$/, "")
    .replaceAll("\\", "/")
    .toLowerCase();
}

export const DOCS: Record<string, MarkdownDoc> = Object.fromEntries(
  Object.entries(docsRaw).map(([p, mod]) => {
    const slug = pathToSlug(p);
    return [slug, toMarkdownDoc({ slug, raw: mod.default })] as const;
  })
);

export const BLOG: Record<string, MarkdownDoc> = Object.fromEntries(
  Object.entries(blogRaw).map(([p, mod]) => {
    const slug = pathToSlug(p);
    return [slug, toMarkdownDoc({ slug, raw: mod.default })] as const;
  })
);

export const DOC_INDEX = Object.values(DOCS).sort((a, b) => a.slug.localeCompare(b.slug));
export const BLOG_INDEX = Object.values(BLOG).sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

