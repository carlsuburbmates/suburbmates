import { NextRequest, NextResponse } from "next/server";
import { syncHubSpotDecisionInbox } from "@/lib/hubspot/decision-inbox";
import { runtimeEnv } from "@/lib/runtime-env";

export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const expectedToken = runtimeEnv("HUBSPOT_DECISION_INBOX_SYNC_TOKEN");
  if (!token || !expectedToken || token !== expectedToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await syncHubSpotDecisionInbox();
    if (!result.enabled) return NextResponse.json({ error: "HubSpot Decision Inbox is not configured" }, { status: 503 });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "HubSpot Decision Inbox sync failed" }, { status: 500 });
  }
}
