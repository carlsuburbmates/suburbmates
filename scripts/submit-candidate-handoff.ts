import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { getCatalogueSourceContract } from "../web/src/lib/automation/catalogue-source-contract";

const endpoint = process.env.CANDIDATE_HANDOFF_URL;
const token = process.env.AUTOMATION_INGEST_TOKEN;
const csvPath = process.argv[2];
const source = process.env.CATALOGUE_SOURCE ?? "openstreetmap";
const sourceContract = getCatalogueSourceContract(source);
// Each request performs qualification, evidence retention and audit writes. Keep
// the workload deliberately small so the Worker remains within its resource
// budget during a large discovery run.
const BATCH_SIZE = 1;
// The public Worker performs provenance and audit writes for each candidate.
// A single, gently paced handoff prevents an automation burst from exhausting
// its request resource budget; prior singleton results are idempotent.
const MAX_CONCURRENT_BATCHES = 1;
// The production Next/Worker route does several provenance and audit writes
// for each source record. A one-second gap makes the weekly import a stable
// single-lane process on the existing Worker limit instead of a burst that can
// exhaust the runtime and strand a partially refreshed source snapshot.
const REQUEST_SETTLE_DELAY_MS = 1_000;
// A deployed Worker must never leave a GitHub shard waiting on a socket without
// a deadline. The route itself treats one minute as an interrupted run, so a
// shorter client deadline gives the idempotent retry loop time to recover it.
const REQUEST_TIMEOUT_MS = 45_000;
// The cumulative backoff extends beyond the one-minute server recovery window.
// Cloudflare can reject a request before the route executes; keep retrying long
// enough for a later request to reach the idempotent stale-run recovery path.
const MAX_ATTEMPTS = 20;
const RETRY_DELAY_MS = 2_000;
const PROCESSING_RECEIPT_DELAY_MS = 65_000;
const RESOURCE_RECOVERY_DELAY_MS = 120_000;
if (!endpoint || !token || !csvPath) throw new Error("CANDIDATE_HANDOFF_URL, AUTOMATION_INGEST_TOKEN and a CSV path are required.");
if (!sourceContract) throw new Error("CATALOGUE_SOURCE must name an approved automated source.");

const shardIndex = readShardFlag("--shard-index", 0);
const shardCount = readShardFlag("--shard-count", 1);
if (shardIndex >= shardCount) throw new Error("--shard-index must be less than --shard-count.");

const allRows = parse(fs.readFileSync(path.resolve(csvPath), "utf8"), { columns: true, skip_empty_lines: true }) as Array<Record<string, string>>;
// A full OSM file has more records than one sequential Worker run can finish
// before an occasional resource retry. Sharding preserves every singleton
// payload identity, so retries still reuse their exact private run evidence.
const rows = allRows.filter((_, index) => index % shardCount === shardIndex);
console.log(`Candidate handoff shard ${shardIndex + 1}/${shardCount}: ${rows.length} of ${allRows.length} records.`);
const artifactUrl = process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
  ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
  : undefined;

const batches = Array.from({ length: Math.ceil(rows.length / BATCH_SIZE) }, (_, batchIndex) => ({
  batchIndex,
  candidates: rows.slice(batchIndex * BATCH_SIZE, (batchIndex + 1) * BATCH_SIZE).map((row) => ({
    source: sourceContract.key, sourceRecordKey: row.source_record_key || row.source_url,
    businessName: row.business_name, categorySlug: row.category_slug, suburbSlug: row.suburb_slug,
    streetAddress: row.address || undefined, description: row.description || undefined, contactEmail: row.contact_email || undefined, phone: row.phone || undefined,
    website: row.website || undefined, tradingHours: row.trading_hours || undefined, sourceUrl: row.source_url, sourceCheckedOn: row.source_checked_on || undefined, notes: row.notes || undefined,
    suburbEvidence: row.suburb_evidence_source_key && row.suburb_evidence_record_key && row.suburb_evidence_url
      ? {
          sourceKey: row.suburb_evidence_source_key,
          sourceRecordKey: row.suburb_evidence_record_key,
          sourceUrl: row.suburb_evidence_url,
          sourceCheckedOn: row.suburb_evidence_checked_on || row.source_checked_on || undefined,
        }
      : undefined,
  })),
}));

await runWithConcurrency(batches, MAX_CONCURRENT_BATCHES, async ({ batchIndex, candidates }) => {
  // Contract version is part of the immutable input identity. A corrected
  // source contract may legitimately requalify prior private exceptions while
  // retaining the earlier audit record unchanged.
  const artifactSha256 = createHash("sha256").update(JSON.stringify({
    source: sourceContract.key,
    sourceContractVersion: sourceContract.version,
    candidates,
  })).digest("hex");
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ source: sourceContract.key, sourceContractVersion: sourceContract.version, artifactSha256, artifactUrl, candidates }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      if (attempt === MAX_ATTEMPTS) {
        throw new Error(`Candidate handoff batch ${batchIndex + 1} did not receive a response after ${MAX_ATTEMPTS} attempts.`);
      }
      const detail = error instanceof Error ? error.name : "network failure";
      console.warn(`Candidate handoff batch ${batchIndex + 1}: ${detail}; retrying (${attempt}/${MAX_ATTEMPTS}).`);
      await delay(retryDelayForNetworkFailure(attempt));
      continue;
    }
    const result = await readResponse(response);
    if (response.ok && response.status !== 202) {
      console.log(`Candidate handoff batch ${batchIndex + 1}: ${result.idempotent ? "already received" : `${result.qualifiedCount ?? 0} qualified, ${result.exceptionCount ?? 0} exceptions`}.`);
      if (!result.idempotent) await delay(REQUEST_SETTLE_DELAY_MS);
      return;
    }
    const retryable = response.status === 202 || [429, 500, 502, 503, 504].includes(response.status);
    if (!retryable || attempt === MAX_ATTEMPTS) {
      throw new Error(`Candidate handoff batch ${batchIndex + 1} failed with ${response.status}: ${result.detail || "No response body"}.`);
    }
    const resourceLimited = response.status === 503 && /worker exceeded resource limits/i.test(result.detail ?? "");
    const retryDelay = response.status === 202
      ? PROCESSING_RECEIPT_DELAY_MS
      : resourceLimited
        ? resourceRecoveryDelay(attempt)
        : RETRY_DELAY_MS * attempt;
    console.warn(`Candidate handoff batch ${batchIndex + 1}: ${response.status === 202 ? "still processing" : resourceLimited ? "Worker resource recovery window" : `temporary ${response.status} response`}; retrying (${attempt}/${MAX_ATTEMPTS}) after ${Math.round(retryDelay / 1000)}s.`);
    await delay(retryDelay);
  }
});

async function readResponse(response: Response): Promise<{ qualifiedCount?: number; exceptionCount?: number; idempotent?: boolean; detail?: string }> {
  const text = await response.text();
  try { return JSON.parse(text) as { qualifiedCount?: number; exceptionCount?: number; idempotent?: boolean; detail?: string }; }
  catch { return { detail: text.slice(0, 1000) }; }
}

function delay(milliseconds: number) { return new Promise((resolve) => setTimeout(resolve, milliseconds)); }

function retryDelayForNetworkFailure(attempt: number) {
  return attempt >= 6 ? RESOURCE_RECOVERY_DELAY_MS : RETRY_DELAY_MS * attempt;
}

function resourceRecoveryDelay(attempt: number) {
  return attempt >= 6 ? RESOURCE_RECOVERY_DELAY_MS : RETRY_DELAY_MS * attempt;
}

function readShardFlag(flag: string, fallback: number) {
  const valueIndex = process.argv.indexOf(flag);
  if (valueIndex === -1) return fallback;
  const value = Number(process.argv[valueIndex + 1]);
  if (!Number.isInteger(value) || value < 0) throw new Error(`${flag} must be a non-negative integer.`);
  return value;
}

async function runWithConcurrency<T>(items: readonly T[], concurrency: number, worker: (item: T) => Promise<void>) {
  let nextIndex = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const item = items[nextIndex++];
      await worker(item);
    }
  }));
}
