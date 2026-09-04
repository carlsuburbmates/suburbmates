import { createClient } from "@supabase/supabase-js";
import { inspectOfficialWebsite } from "../web/src/lib/official-website-enrichment";

type Candidate = { id: string; website: string; category_slug: string | null; suburb_slug: string | null };

const limit = 25;
const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error("Supabase configuration is required for the read-only website pilot inspection.");

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const { data, error } = await supabase
  .from("published_vendors")
  .select("id, website, category_slug, suburb_slug")
  .eq("is_claimed", false)
  .not("website", "is", null)
  .order("category_slug", { ascending: true })
  .order("suburb_slug", { ascending: true })
  .order("id", { ascending: true });
if (error) throw new Error("Could not read the public website pilot sample.");

const candidates = selectBroadSample((data ?? []) as Candidate[], limit);
const inspections = await Promise.all(candidates.map(async (candidate) => inspectOfficialWebsite(candidate.website)));
const outcomes = countBy(inspections.map((inspection) => inspection.outcome));
const reasons = countBy(inspections.map((inspection) => inspection.reason ?? "eligible"));
const facts = inspections.reduce((total, inspection) => total + inspection.facts.length, 0);

console.log(JSON.stringify({
  purpose: "Read-only D-021 website pilot inspection. No result was stored, applied, published, or used to change a listing.",
  sampleSize: candidates.length,
  representedCategories: new Set(candidates.map((candidate) => candidate.category_slug).filter(Boolean)).size,
  representedSuburbs: new Set(candidates.map((candidate) => candidate.suburb_slug).filter(Boolean)).size,
  outcomes,
  reasons,
  extractedFactCount: facts,
  nextGate: "Terms/reuse review remains pending. This inspection is not permission to retain or display website facts.",
}, null, 2));

function selectBroadSample(rows: Candidate[], maximum: number) {
  const selected: Candidate[] = [];
  const used = new Set<string>();
  const categorySeen = new Set<string>();
  const suburbSeen = new Set<string>();
  for (const row of rows) {
    const category = row.category_slug ?? "uncategorised";
    const suburb = row.suburb_slug ?? "unspecified";
    if ((categorySeen.has(category) && suburbSeen.has(suburb)) || used.has(row.id)) continue;
    selected.push(row); used.add(row.id); categorySeen.add(category); suburbSeen.add(suburb);
    if (selected.length === maximum) return selected;
  }
  for (const row of rows) {
    if (!used.has(row.id)) selected.push(row);
    if (selected.length === maximum) return selected;
  }
  return selected;
}

function countBy(values: string[]) {
  return values.reduce<Record<string, number>>((counts, value) => {
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}
