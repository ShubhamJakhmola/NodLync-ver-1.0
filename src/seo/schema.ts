import { getSiteUrl, SITE } from "./site";

export function softwareApplicationSchema(params?: { description?: string }) {
  const siteUrl = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE.name,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Chrome",
    description: params?.description ?? SITE.defaultDescription,
    url: siteUrl,
  };
}

export function techArticleSchema(params: {
  headline: string;
  description: string;
  path: string;
  datePublished?: string;
  dateModified?: string;
}) {
  const siteUrl = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: params.headline,
    description: params.description,
    url: `${siteUrl}${params.path}`,
    mainEntityOfPage: `${siteUrl}${params.path}`,
    datePublished: params.datePublished,
    dateModified: params.dateModified ?? params.datePublished,
    publisher: { "@type": "Organization", name: SITE.name, url: siteUrl },
  };
}

export function faqSchema(params: { path: string; questions: Array<{ q: string; a: string }> }) {
  const siteUrl = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: params.questions.map((qa) => ({
      "@type": "Question",
      name: qa.q,
      acceptedAnswer: { "@type": "Answer", text: qa.a },
    })),
    url: `${siteUrl}${params.path}`,
  };
}

