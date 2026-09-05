import { getCloudflareContext } from "@opennextjs/cloudflare";

export const directoryObservabilityEvents = [
  "entry_home",
  "entry_directory",
  "entry_profile",
  "entry_contact",
  "entry_owner",
  "directory_search",
  "business_profile_view",
  "profile_cohort_rich_view",
  "profile_cohort_baseline_view",
  "profile_cohort_website_enriched_view",
  "profile_cohort_website_unchanged_view",
  "outbound_website",
  "outbound_booking",
  "outbound_menu",
  "outbound_phone",
  "outbound_email",
  "outbound_directions",
  "profile_cohort_rich_contact",
  "profile_cohort_baseline_contact",
  "profile_cohort_website_enriched_contact",
  "profile_cohort_website_unchanged_contact",
  "claim_completed",
  "missing_business_submission_completed",
  "contact_request_completed",
] as const;

export type DirectoryObservabilityEvent = (typeof directoryObservabilityEvents)[number];

const eventSet = new Set<string>(directoryObservabilityEvents);

export function isDirectoryObservabilityEvent(value: unknown): value is DirectoryObservabilityEvent {
  return typeof value === "string" && eventSet.has(value);
}

// Only an allow-listed event name reaches Cloudflare Analytics Engine. No
// search text, URL, listing identifier, form content, account identifier, IP,
// cookie, or browser fingerprint is included in this first-party data point.
export async function recordDirectoryObservabilityEvent(event: DirectoryObservabilityEvent): Promise<void> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    env.DIRECTORY_OBSERVABILITY?.writeDataPoint({ blobs: [event] });
  } catch {
    // Observability must never change or delay a public journey.
  }
}
