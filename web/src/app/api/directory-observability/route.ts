import { isDirectoryObservabilityEvent, recordDirectoryObservabilityEvent } from "@/lib/directory-observability";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return new Response(null, { status: 403 });

  const body = await request.text();
  if (body.length > 96) return new Response(null, { status: 400 });
  try {
    const payload = JSON.parse(body) as { event?: unknown };
    if (!isDirectoryObservabilityEvent(payload.event)) return new Response(null, { status: 400 });
    await recordDirectoryObservabilityEvent(payload.event);
  } catch {
    return new Response(null, { status: 400 });
  }
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
