export function normaliseSubmissionWebsite(value: string) {
  const input = value.trim();
  if (!input) return "";

  const candidate = /^https?:\/\//i.test(input)
    ? input.replace(/^http:\/\//i, "https://")
    : `https://${input}`;

  try {
    const url = new URL(candidate);
    return url.protocol === "https:" && url.hostname ? url.toString() : input;
  } catch {
    return input;
  }
}
