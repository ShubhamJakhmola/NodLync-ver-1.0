export type MarkdownDoc = {
  slug: string;
  title: string;
  description: string;
  date?: string;
  body: string;
};

function parseFrontmatter(raw: string) {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match) return { data: {}, body: raw };

  const fm = match[1];
  const body = match[2];
  const data: Record<string, string> = {};

  for (const line of fm.split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim().replace(/^"(.*)"$/, "$1");
    if (key) data[key] = value;
  }

  return { data, body };
}

export function toMarkdownDoc(params: { slug: string; raw: string }): MarkdownDoc {
  const { data, body } = parseFrontmatter(params.raw.trim());
  const title = data.title || inferTitle(body) || params.slug;
  const description = data.description || "";
  const date = data.date;
  return { slug: params.slug, title, description, date, body };
}

function inferTitle(body: string) {
  const h1 = body.match(/^#\s+(.+)$/m);
  return h1?.[1]?.trim();
}

