import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

const endpoint = process.env.CANDIDATE_HANDOFF_URL;
const token = process.env.AUTOMATION_INGEST_TOKEN;
const csvPath = process.argv[2];
if (!endpoint || !token || !csvPath) throw new Error("CANDIDATE_HANDOFF_URL, AUTOMATION_INGEST_TOKEN and a CSV path are required.");

const rows = parse(fs.readFileSync(path.resolve(csvPath), "utf8"), { columns: true, skip_empty_lines: true }) as Array<Record<string, string>>;
const artifactUrl = process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
  ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
  : undefined;

for (let index = 0; index < rows.length; index += 100) {
  const candidates = rows.slice(index, index + 100).map((row) => ({
    source: "openstreetmap", businessName: row.business_name, categorySlug: row.category_slug, suburbSlug: row.suburb_slug,
    streetAddress: row.address || undefined, contactEmail: row.contact_email || undefined, phone: row.phone || undefined,
    website: row.website || undefined, sourceUrl: row.source_url, sourceCheckedOn: row.source_checked_on || undefined, notes: row.notes || undefined,
  }));
  const artifactSha256 = createHash("sha256").update(JSON.stringify(candidates)).digest("hex");
  const response = await fetch(endpoint, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ source: "openstreetmap", artifactSha256, artifactUrl, candidates }) });
  if (!response.ok) throw new Error(`Candidate handoff batch ${index / 100 + 1} failed with ${response.status}.`);
  const result = await response.json() as { qualifiedCount?: number; exceptionCount?: number; idempotent?: boolean };
  console.log(`Candidate handoff batch ${index / 100 + 1}: ${result.idempotent ? "already received" : `${result.qualifiedCount ?? 0} qualified, ${result.exceptionCount ?? 0} exceptions`}.`);
}
