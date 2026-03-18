export function maskApiKey(apiKey: string) {
  if (!apiKey) return "Not available";
  if (apiKey.length <= 8) return `${apiKey.slice(0, 2)}****`;
  return `${apiKey.slice(0, 3)}-${"*".repeat(Math.max(apiKey.length - 7, 4))}${apiKey.slice(-4)}`;
}

export function normalizeTagList(tags?: string | null) {
  if (!tags) return [];
  return tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}
