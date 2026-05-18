export const SITE = {
  name: "NodLync",
  tagline: "AI Operating Workspace",
  defaultTitle: "NodLync - AI Operating Workspace",
  defaultDescription:
    "A provider-agnostic AI workspace for projects, workflows, API keys, multimodal collaboration, provider orchestration, and debugging.",
  siteUrl: (import.meta.env.VITE_SITE_URL as string | undefined) ?? "",
  twitterHandle: "@nodlync",
  ogImagePath: "/logo-512.png",
};

export function getSiteUrl() {
  if (SITE.siteUrl) return SITE.siteUrl.replace(/\/+$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "https://nodlync.netlify.app";
}
