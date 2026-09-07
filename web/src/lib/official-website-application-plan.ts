import type { WebsiteFact } from "./official-website-enrichment";

export type OfficialWebsiteApplicationVendor = { id: string; business_name: string; website: string; suburb_slug: string; ownership_status: string; description: string | null; contact_email: string | null; phone: string | null; street_address: string | null; trading_hours: string | null; services: string[] | null; booking_url: string | null; menu_url: string | null; area_served: string[] | null; accessibility_features: string[] | null };
export type OfficialWebsiteApplicationPlan = { updates: Record<string, string | string[]>; facts: Array<{ fieldName: string; value: string; sourceUrl?: string; applied: boolean; conflict: boolean; evidenceOnly?: boolean }>; appliedFields: string[]; conflictFields: string[] };

function normal(value: string) { return value.replace(/\s+/g, " ").trim().toLowerCase(); }
function factKey(fieldName: WebsiteFact["fieldName"], value: string) {
  if (fieldName === "phone") {
    const digits = value.replace(/\D/g, "");
    return digits.startsWith("61") && digits.length >= 10 ? `0${digits.slice(2)}` : digits;
  }
  if (fieldName === "email") return value.trim().toLowerCase();
  if (fieldName === "booking_url" || fieldName === "menu_url") {
    try { const url = new URL(value); url.hash = ""; return url.toString().replace(/\/$/, "").toLowerCase(); } catch { return normal(value); }
  }
  return normal(value);
}
function values(facts: WebsiteFact[], fieldName: WebsiteFact["fieldName"]) {
  const unique = new Map<string, string>();
  for (const fact of facts.filter((item) => item.fieldName === fieldName)) {
    const value = fact.value.trim();
    if (value && !unique.has(factKey(fieldName, value))) unique.set(factKey(fieldName, value), value);
  }
  return [...unique.values()].slice(0, 12);
}
function sourceFor(facts: WebsiteFact[], fieldName: WebsiteFact["fieldName"], value: string) { return facts.find((fact) => fact.fieldName === fieldName && factKey(fieldName, fact.value) === factKey(fieldName, value))?.sourceUrl; }
function same(value: string | null, incoming: string) { return value !== null && normal(value) === normal(incoming); }
function sameFact(fieldName: WebsiteFact["fieldName"], value: string | null, incoming: string) { return value !== null && factKey(fieldName, value) === factKey(fieldName, incoming); }
function sameList(value: string[] | null, incoming: string[]) { return (value ?? []).map(normal).sort().join("\u0000") === incoming.map(normal).sort().join("\u0000"); }
function addressMatchesListingLocality(suburbSlug: string, address: string) { const locality = normal(suburbSlug.replaceAll("-", " ")); return locality !== "darebin" && normal(address).includes(locality); }

/** A new sentence assembled only from retained structured facts, never website prose. */
export function factualSummary(facts: WebsiteFact[]) {
  const services = values(facts, "service"); const areas = values(facts, "area_served"); const hours = values(facts, "trading_hours")[0];
  if (!services.length && !areas.length) return null;
  const summary = [services.length ? `Services include ${services.slice(0, 3).join(", ")}.` : null, areas.length ? `Serves ${areas.slice(0, 3).join(", ")}.` : null, hours ? `Source-reported hours: ${hours}.` : null].filter((value): value is string => Boolean(value)).join(" ");
  return summary.length > 0 && summary.length <= 500 ? summary : null;
}

/** Plans only empty-field application; populated values remain evidence or conflicts. */
export function planOfficialWebsiteApplication(vendor: OfficialWebsiteApplicationVendor, facts: WebsiteFact[]): OfficialWebsiteApplicationPlan {
  const updates: Record<string, string | string[]> = {}; const evidence: OfficialWebsiteApplicationPlan["facts"] = []; const appliedFields: string[] = []; const conflictFields: string[] = [];
  const eligibleFacts = facts.filter((fact) => !fact.evidenceOnly);
  const scalar: Array<[WebsiteFact["fieldName"], keyof OfficialWebsiteApplicationVendor]> = [["phone", "phone"], ["email", "contact_email"], ["trading_hours", "trading_hours"], ["street_address", "street_address"], ["booking_url", "booking_url"], ["menu_url", "menu_url"]];
  for (const [factName, column] of scalar) {
    const current = vendor[column] as string | null;
    const candidates = values(eligibleFacts, factName);
    const eligible = candidates.filter((value) => column !== "street_address" || addressMatchesListingLocality(vendor.suburb_slug, value));
    const ambiguous = !current && eligible.length > 1;
    const storageField = String(column);
    for (const value of candidates) {
      const equal = sameFact(factName, current, value);
      const localitySafe = eligible.includes(value);
      const apply = !current && localitySafe && eligible.length === 1;
      const conflict = (Boolean(current) && !equal) || (ambiguous && localitySafe);
      evidence.push({ fieldName: storageField, value, sourceUrl: sourceFor(eligibleFacts, factName, value), applied: apply, conflict });
      if (apply) {
        updates[column] = value;
        if (!appliedFields.includes(storageField)) appliedFields.push(storageField);
      } else if (conflict && !conflictFields.includes(storageField)) {
        conflictFields.push(storageField);
      }
    }
  }
  const arrays: Array<[WebsiteFact["fieldName"], "services" | "area_served" | "accessibility_features"]> = [["service", "services"], ["area_served", "area_served"], ["accessibility", "accessibility_features"]];
  for (const [factName, column] of arrays) { const incoming = values(eligibleFacts, factName); if (!incoming.length) continue; const current = vendor[column] as string[] | null; const equal = sameList(current, incoming); const apply = (current?.length ?? 0) === 0; for (const value of incoming) evidence.push({ fieldName: factName, value, sourceUrl: sourceFor(eligibleFacts, factName, value), applied: apply, conflict: !apply && !equal }); if (apply) { updates[column] = incoming; appliedFields.push(factName); } else if (!equal) conflictFields.push(factName); }
  const summary = factualSummary(eligibleFacts);
  if (summary) { const equal = same(vendor.description, summary); const apply = !vendor.description; evidence.push({ fieldName: "description", value: summary, sourceUrl: eligibleFacts.find((fact) => fact.sourceUrl)?.sourceUrl, applied: apply, conflict: Boolean(vendor.description) && !equal }); if (apply) { updates.description = summary; appliedFields.push("description"); } else if (!equal) conflictFields.push("description"); }
  const storageName = (fieldName: WebsiteFact["fieldName"]) => fieldName === "email" ? "contact_email" : fieldName;
  for (const fact of facts.filter((item) => item.evidenceOnly)) {
    if (evidence.some((item) => item.fieldName === storageName(fact.fieldName) && normal(item.value) === normal(fact.value))) continue;
    evidence.push({ fieldName: storageName(fact.fieldName), value: fact.value, sourceUrl: fact.sourceUrl, applied: false, conflict: false, evidenceOnly: true });
  }
  return { updates, facts: evidence, appliedFields, conflictFields };
}
