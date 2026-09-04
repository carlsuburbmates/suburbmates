import { NextRequest, NextResponse } from "next/server";
import { runOfficialWebsiteEnrichment } from "@/lib/official-website-application";
import { runtimeEnv } from "@/lib/runtime-env";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!runtimeEnv("AUTOMATION_INGEST_TOKEN") || token !== runtimeEnv("AUTOMATION_INGEST_TOKEN")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = await request.json() as { runKey?: unknown; limit?: unknown }; const runKey = typeof body.runKey === "string" ? body.runKey : ""; const limit = typeof body.limit === "number" ? body.limit : 25;
    if (!/^[0-9a-f]{64}$/.test(runKey) || !Number.isInteger(limit) || limit < 1 || limit > 25) return NextResponse.json({ error: "Invalid official-website enrichment request" }, { status: 400 });
    const result = await runOfficialWebsiteEnrichment(runKey, limit); return NextResponse.json(result, { status: result.state === "processing" ? 202 : 200 });
  } catch (error) { console.error("Official-website enrichment failed", error); return NextResponse.json({ error: "Official-website enrichment did not complete" }, { status: 500 }); }
}
