import { NextRequest, NextResponse } from "next/server";
import { syncHubSpotDecisionInbox } from "@/lib/hubspot/decision-inbox";
import { runtimeEnv } from "@/lib/runtime-env";

export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const expectedToken = runtimeEnv("HUBSPOT_DECISION_INBOX_SYNC_TOKEN");
  if (!token || !expectedToken || token !== expectedToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await syncHubSpotDecisionInbox();
    if (!result.enabled) {
      return NextResponse.json({
        error: "HubSpot Decision Inbox is not configured",
        configuration: {
          enabled: runtimeEnv("HUBSPOT_DECISION_INBOX_ENABLED") === "true",
          token: Boolean(runtimeEnv("HUBSPOT_PRIVATE_APP_TOKEN")),
          owner: Boolean(runtimeEnv("HUBSPOT_OWNER_ID")),
        },
      }, { status: 503 });
    }
    return NextResponse.json(result);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown sync error";
    console.error("HubSpot Decision Inbox sync failed", { reason });
    return NextResponse.json({ error: "HubSpot Decision Inbox sync failed", reason }, { status: 500 });
  }
}
