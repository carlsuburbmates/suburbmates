import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { OPENSTREETMAP_SOURCE, OPENSTREETMAP_SOURCE_CONTRACT_VERSION } from "../web/src/lib/automation/openstreetmap-source-contract";

const endpoint = process.env.CANDIDATE_HANDOFF_URL;
const token = process.env.AUTOMATION_INGEST_TOKEN;
const csvPath = process.argv[2];
// Each request performs qualification, evidence retention and audit writes. Keep
// the workload deliberately small so the Worker remains within its resource
// budget during a large discovery run.
const BATCH_SIZE = 1;
const MAX_CONCURRENT_BATCHES = 2;
// The cumulative backoff exceeds the one-minute server recovery window.
const MAX_ATTEMPTS = 9;
const RETRY_DELAY_MS = 2_000;
if (!endpoint || !token || !csvPath) throw new Error("CANDIDATE_HANDOFF_URL, AUTOMATION_INGEST_TOKEN and a CSV path are required.");

const rows = parse(fs.readFileSync(path.resolve(csvPath), "utf8"), { columns: true, skip_empty_lines: true }) as Array<Record<string, string>>;
const artifactUrl = process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
  ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
  : undefined;

const batches = Array.from({ length: Math.ceil(rows.length / BATCH_SIZE) }, (_, batchIndex) => ({
  batchIndex,
  candidates: rows.slice(batchIndex * BATCH_SIZE, (batchIndex + 1) * BATCH_SIZE).map((row) => ({
    source: OPENSTREETMAP_SOURCE, businessName: row.business_name, categorySlug: row.category_slug, suburbSlug: row.suburb_slug,
    streetAddress: row.address || undefined, contactEmail: row.contact_email || undefined, phone: row.phone || undefined,
    website: row.website || undefined, sourceUrl: row.source_url, sourceCheckedOn: row.source_checked_on || undefined, notes: row.notes || undefined,
  })),
}));

await runWithConcurrency(batches, MAX_CONCURRENT_BATCHES, async ({ batchIndex, candidates }) => {
  const artifactSha256 = createHash("sha256").update(JSON.stringify(candidates)).digest("hex");
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const response = await fetch(endpoint, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ source: OPENSTREETMAP_SOURCE, sourceContractVersion: OPENSTREETMAP_SOURCE_CONTRACT_VERSION, artifactSha256, artifactUrl, candidates }) });
    const result = await readResponse(response);
    if (response.ok && response.status !== 202) {
      console.log(`Candidate handoff batch ${batchIndex + 1}: ${result.idempotent ? "already received" : `${result.qualifiedCount ?? 0} qualified, ${result.exceptionCount ?? 0} exceptions`}.`);
      return;
    }
    const retryable = response.status === 202 || [429, 500, 502, 503, 504].includes(response.status);
    if (!retryable || attempt === MAX_ATTEMPTS) {
      throw new Error(`Candidate handoff batch ${batchIndex + 1} failed with ${response.status}: ${result.detail || "No response body"}.`);
    }
    console.warn(`Candidate handoff batch ${batchIndex + 1}: ${response.status === 202 ? "still processing" : `temporary ${response.status} response`}; retrying (${attempt}/${MAX_ATTEMPTS}).`);
    await delay(RETRY_DELAY_MS * attempt);
  }
});

async function readResponse(response: Response): Promise<{ qualifiedCount?: number; exceptionCount?: number; idempotent?: boolean; detail?: string }> {
  const text = await response.text();
  try { return JSON.parse(text) as { qualifiedCount?: number; exceptionCount?: number; idempotent?: boolean; detail?: string }; }
  catch { return { detail: text.slice(0, 1000) }; }
}

function delay(milliseconds: number) { return new Promise((resolve) => setTimeout(resolve, milliseconds)); }

async function runWithConcurrency<T>(items: readonly T[], concurrency: number, worker: (item: T) => Promise<void>) {
  let nextIndex = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const item = items[nextIndex++];
      await worker(item);
    }
  }));
}
