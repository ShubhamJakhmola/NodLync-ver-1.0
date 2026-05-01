import { Helmet } from "react-helmet-async";
import { getSiteUrl, SITE } from "./site";

export type SeoProps = {
  title?: string;
  description?: string;
  path?: string;
  canonicalUrl?: string;
  noindex?: boolean;
  ogType?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
};

export default function SEO(props: SeoProps) {
  const siteUrl = getSiteUrl();
  const title = props.title ? `${props.title} | ${SITE.name}` : SITE.defaultTitle;
  const description = props.description ?? SITE.defaultDescription;
  const canonical =
    props.canonicalUrl ?? (props.path ? `${siteUrl}${props.path}` : `${siteUrl}/`);
  const ogImage = `${siteUrl}${SITE.ogImagePath}`;
  const robots = props.noindex ? "noindex, nofollow" : "index, follow";

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      <meta name="robots" content={robots} />

      <meta property="og:site_name" content={SITE.name} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={props.ogType ?? "website"} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={ogImage} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:site" content={SITE.twitterHandle} />

      {props.publishedTime && <meta property="article:published_time" content={props.publishedTime} />}
      {props.modifiedTime && <meta property="article:modified_time" content={props.modifiedTime} />}
    </Helmet>
  );
}

