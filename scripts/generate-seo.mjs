import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();

const siteUrl =
  process.env.SITE_URL ||
  process.env.VITE_SITE_URL ||
  "https://nodlync.netlify.app";

const publicDir = path.join(projectRoot, "public");
const contentDir = path.join(projectRoot, "src", "content");
const docsDir = path.join(contentDir, "docs");
const blogDir = path.join(contentDir, "blog");
const docsKnowledgeFile = path.join(contentDir, "docsKnowledge.ts");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function listMarkdownRoutes(rootDir, urlPrefix) {
  if (!fs.existsSync(rootDir)) return [];
  const routes = [];

  /** @param {string} dir */
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
        const rel = path.relative(rootDir, full).replaceAll("\\", "/");
        const slug = rel.replace(/\.md$/i, "").replaceAll(" ", "-").toLowerCase();
        routes.push(`${urlPrefix}/${slug}`);
      }
    }
  };

  walk(rootDir);
  return routes;
}

function listKnowledgeDocRoutes(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const source = fs.readFileSync(filePath, "utf8");
  const routes = [];
  const seen = new Set();
  const re = /slug:\s*"([^"]+)"/g;
  let match;

  while ((match = re.exec(source))) {
    const slug = match[1].trim();
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    routes.push(`/docs/${slug}`);
  }

  return routes;
}

function isoDate() {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

function xmlEscape(s) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function writeFile(relPath, contents) {
  ensureDir(path.dirname(relPath));
  fs.writeFileSync(relPath, contents, "utf8");
}

function normalizeBase(url) {
  return url.replace(/\/+$/, "");
}

function buildSitemap(urls) {
  const today = isoDate();
  const base = normalizeBase(siteUrl);
  const urlset = urls
    .map((u) => {
      const loc = xmlEscape(`${base}${u}`);
      return `  <url><loc>${loc}</loc><lastmod>${today}</lastmod></url>`;
    })
    .join("\n");

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    urlset,
    `</urlset>`,
    "",
  ].join("\n");
}

function buildRobots() {
  const base = normalizeBase(siteUrl);
  return [
    "User-agent: *",
    "Allow: /",
    "",
    "Disallow: /app/",
    "Disallow: /login",
    "Disallow: /register",
    "Disallow: /forgot-password",
    "",
    `Sitemap: ${base}/sitemap.xml`,
    "",
  ].join("\n");
}

function buildLlmsTxt(indexableUrls) {
  const base = normalizeBase(siteUrl);
  const core = [
    "/",
    "/features",
    "/docs",
    "/docs/getting-started",
    "/docs/beginner-guide",
    "/docs/ai-providers",
    "/docs/extension-guide",
    "/docs/troubleshooting",
    "/blog",
  ].filter((u) => indexableUrls.includes(u));

  const docs = indexableUrls.filter((u) => u.startsWith("/docs/") && u !== "/docs");
  const blog = indexableUrls.filter((u) => u.startsWith("/blog/") && u !== "/blog");

  const toLinks = (arr) => arr.slice(0, 60).map((u) => `- ${base}${u}`);

  return [
    "# NodLync",
    "",
    "NodLync is an AI workspace and knowledge platform for projects, workflows, providers, model testing, collaboration, traffic capture, and debugging.",
    "",
    "## Key pages",
    ...toLinks(core),
    "",
    "## Documentation",
    ...toLinks(docs),
    "",
    "## Blog",
    ...toLinks(blog),
    "",
  ].join("\n");
}

ensureDir(publicDir);

const docsRoutes = listMarkdownRoutes(docsDir, "/docs");
const knowledgeDocsRoutes = listKnowledgeDocRoutes(docsKnowledgeFile);
const blogRoutes = listMarkdownRoutes(blogDir, "/blog");

const staticIndexable = ["/", "/features", "/docs", "/blog", "/privacy", "/terms"];
const urls = Array.from(new Set([...staticIndexable, ...docsRoutes, ...knowledgeDocsRoutes, ...blogRoutes])).sort();

writeFile(path.join(publicDir, "sitemap.xml"), buildSitemap(urls));
writeFile(path.join(publicDir, "robots.txt"), buildRobots());
writeFile(path.join(publicDir, "llms.txt"), buildLlmsTxt(urls));

console.log(`Generated sitemap.xml (${urls.length} urls), robots.txt, llms.txt using base=${siteUrl}`);
