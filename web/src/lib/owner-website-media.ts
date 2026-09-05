import "server-only";

const MAX_BYTES = 2 * 1024 * 1024;

export const sameOwnerWebsiteHost = (left: string, right: string) =>
  left.replace(/^www\./, "").toLowerCase() === right.replace(/^www\./, "").toLowerCase();

export function parseOwnerWebsiteImageUrl(originUrl: string, website: string) {
  const requested = new URL(originUrl);
  const recorded = new URL(website);
  if (requested.protocol !== "https:" || requested.username || requested.password || !sameOwnerWebsiteHost(requested.hostname, recorded.hostname)) {
    throw new Error("Use an HTTPS image URL from the recorded business website.");
  }
  return { requested, recordedHost: recorded.hostname };
}

export async function fetchOwnerWebsiteImage(url: URL, recordedHost: string) {
  let current = url;
  for (let count = 0; count < 4; count += 1) {
    try {
      const response = await fetch(current, {
        redirect: "manual",
        signal: AbortSignal.timeout(12_000),
        headers: { "user-agent": "SuburbMates-owner-media-import/1.0" },
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) return null;
        const next = new URL(location, current);
        if (next.protocol !== "https:" || !sameOwnerWebsiteHost(next.hostname, recordedHost)) return null;
        current = next;
        continue;
      }
      const contentType = response.headers.get("content-type")?.split(";", 1)[0].toLowerCase();
      if (!response.ok || !contentType || !["image/jpeg", "image/png", "image/webp"].includes(contentType)) return null;
      const length = Number(response.headers.get("content-length") ?? 0);
      if (length > MAX_BYTES) return null;
      const bytes = new Uint8Array(await response.arrayBuffer());
      return bytes.byteLength > 0 && bytes.byteLength <= MAX_BYTES
        ? { bytes, type: contentType as "image/jpeg" | "image/png" | "image/webp" }
        : null;
    } catch {
      return null;
    }
  }
  return null;
}
