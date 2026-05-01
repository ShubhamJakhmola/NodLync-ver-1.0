export const SITE = {
  name: "NodLync",
  tagline: "API + Frontend Performance Monitoring",
  defaultTitle: "NodLync — API + Frontend Performance Monitoring",
  defaultDescription:
    "Monitor API latency and frontend performance metrics together (TTFB, DCL, TBT, LCP). Diagnose slow experiences with actionable, developer-first insights.",
  siteUrl: (import.meta.env.VITE_SITE_URL as string | undefined) ?? "",
  twitterHandle: "@nodlync",
  ogImagePath: "/logo-512.png",
};

export function getSiteUrl() {
  if (SITE.siteUrl) return SITE.siteUrl.replace(/\/+$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "https://nodlync.com";
}
