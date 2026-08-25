import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { DirectoryObservabilityEvent } from "@/lib/directory-observability";

type EventCounts = Partial<Record<DirectoryObservabilityEvent, number>>;

export type DirectoryObservabilitySummary = {
  rangeStart: string;
  rangeEnd: string;
  readAt: string;
  visits: number | null;
  topEntries: Array<{ label: string; count: number }>;
  events: EventCounts;
  collectionFailures: string[];
};

type GraphqlResponse = {
  data?: {
    viewer?: {
      accounts?: Array<{
        rumPageloadEventsAdaptiveGroups?: Array<{ sum?: { visits?: number } }>;
      }>;
    };
  };
  errors?: Array<{ message?: string }>;
};

type SqlResponse = {
  success?: boolean;
  result?: { data?: Array<Record<string, unknown>> } | Array<Record<string, unknown>>;
  errors?: Array<{ message?: string }>;
};

const entryLabels: Record<string, string> = {
  entry_home: "Home",
  entry_directory: "Directory",
  entry_profile: "Business profiles",
  entry_contact: "Contact",
  entry_owner: "Owner and account pages",
};

export async function getDirectoryObservabilitySummary(): Promise<DirectoryObservabilitySummary> {
  const rangeEnd = new Date();
  const rangeStart = new Date(rangeEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
  const summary: DirectoryObservabilitySummary = {
    rangeStart: rangeStart.toISOString(),
    rangeEnd: rangeEnd.toISOString(),
    readAt: new Date().toISOString(),
    visits: null,
    topEntries: [],
    events: {},
    collectionFailures: [],
  };

  try {
    const { env } = await getCloudflareContext({ async: true });
    const accountId = env.DIRECTORY_OBSERVABILITY_ACCOUNT_ID;
    const apiToken = env.DIRECTORY_OBSERVABILITY_API_TOKEN;
    const siteTag = env.DIRECTORY_OBSERVABILITY_SITE_TAG;
    if (!accountId || !apiToken || !siteTag) {
      summary.collectionFailures.push("Directory analytics is not configured yet.");
      return summary;
    }

    const [visits, actions] = await Promise.all([
      getVisits({ accountId, apiToken, siteTag, rangeStart: summary.rangeStart, rangeEnd: summary.rangeEnd }),
      getActionCounts({ accountId, apiToken }),
    ]);
    summary.visits = visits;
    summary.events = actions;
    summary.topEntries = Object.entries(entryLabels)
      .map(([event, label]) => ({ label, count: actions[event as DirectoryObservabilityEvent] ?? 0 }))
      .filter((entry) => entry.count > 0)
      .sort((left, right) => right.count - left.count);
  } catch {
    summary.collectionFailures.push("Directory analytics could not be read. No directory state changed.");
  }

  return summary;
}

async function getVisits({ accountId, apiToken, siteTag, rangeStart, rangeEnd }: { accountId: string; apiToken: string; siteTag: string; rangeStart: string; rangeEnd: string }) {
  const response = await fetch("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query: "query Visits($accountTag:String!, $siteTag:String!, $start:DateTime!, $end:DateTime!){viewer{accounts(filter:{accountTag:$accountTag}){rumPageloadEventsAdaptiveGroups(filter:{datetime_geq:$start,datetime_leq:$end,siteTag:$siteTag,bot:0},limit:1){sum{visits}}}}}",
      variables: { accountTag: accountId, siteTag, start: rangeStart, end: rangeEnd },
    }),
    cache: "no-store",
  });
  const payload = (await response.json()) as GraphqlResponse;
  if (!response.ok || payload.errors?.length) throw new Error("Cloudflare Web Analytics query failed");
  return payload.data?.viewer?.accounts?.[0]?.rumPageloadEventsAdaptiveGroups?.[0]?.sum?.visits ?? 0;
}

async function getActionCounts({ accountId, apiToken }: { accountId: string; apiToken: string }): Promise<EventCounts> {
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/analytics_engine/sql`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "text/plain" },
    body: "SELECT blob1 AS event, SUM(_sample_interval) AS count FROM suburbmates_directory_observability WHERE timestamp >= NOW() - INTERVAL '7' DAY GROUP BY event ORDER BY count DESC LIMIT 50",
    cache: "no-store",
  });
  const payload = (await response.json()) as SqlResponse;
  const errorMessage = payload.errors?.map((error) => error.message ?? "").join(" ") ?? "";
  // A new dataset exists only after its first eligible event. This is an empty
  // report, not a workflow failure or an operator task.
  if (!response.ok || payload.success === false) {
    if (/does not exist|unknown table|not found/i.test(errorMessage)) return {};
    throw new Error("Cloudflare Analytics Engine query failed");
  }
  const rows = Array.isArray(payload.result) ? payload.result : payload.result?.data ?? [];
  return rows.reduce<EventCounts>((counts, row) => {
    if (typeof row.event !== "string") return counts;
    const count = Number(row.count);
    if (!Number.isFinite(count)) return counts;
    counts[row.event as DirectoryObservabilityEvent] = count;
    return counts;
  }, {});
}
