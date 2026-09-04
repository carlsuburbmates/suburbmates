import type { WebsiteFact } from "./official-website-enrichment";

export type OfficialWebsiteApplicationVendor = { id: string; business_name: string; website: string; ownership_status: string; description: string | null; contact_email: string | null; phone: string | null; street_address: string | null; trading_hours: string | null; services: string[] | null; booking_url: string | null; menu_url: string | null; area_served: string[] | null; accessibility_features: string[] | null };
export type OfficialWebsiteApplicationPlan = { updates: Record<string, string | string[]>; facts: Array<{ fieldName: string; value: string; applied: boolean; conflict: boolean }>; appliedFields: string[]; conflictFields: string[] };

function normal(value: string) { return value.replace(/\s+/g, " ").trim().toLowerCase(); }
function values(facts: WebsiteFact[], fieldName: WebsiteFact["fieldName"]) { return [...new Set(facts.filter((fact) => fact.fieldName === fieldName).map((fact) => fact.value.trim()).filter(Boolean))].slice(0, 12); }
function same(value: string | null, incoming: string) { return value !== null && normal(value) === normal(incoming); }
function sameList(value: string[] | null, incoming: string[]) { return (value ?? []).map(normal).sort().join("\u0000") === incoming.map(normal).sort().join("\u0000"); }

/** A new sentence assembled only from retained structured facts, never website prose. */
export function factualSummary(facts: WebsiteFact[]) {
  const services = values(facts, "service"); const areas = values(facts, "area_served"); const hours = values(facts, "trading_hours")[0];
  const summary = [services.length ? `Services include ${services.slice(0, 3).join(", ")}.` : null, areas.length ? `Serves ${areas.slice(0, 3).join(", ")}.` : null, hours ? `Source-reported hours: ${hours}.` : null].filter((value): value is string => Boolean(value)).join(" ");
  return summary.length > 0 && summary.length <= 500 ? summary : null;
}

/** Plans only empty-field application; populated values remain evidence or conflicts. */
export function planOfficialWebsiteApplication(vendor: OfficialWebsiteApplicationVendor, facts: WebsiteFact[]): OfficialWebsiteApplicationPlan {
  const updates: Record<string, string | string[]> = {}; const evidence: OfficialWebsiteApplicationPlan["facts"] = []; const appliedFields: string[] = []; const conflictFields: string[] = [];
  const scalar: Array<[WebsiteFact["fieldName"], keyof OfficialWebsiteApplicationVendor]> = [["phone", "phone"], ["email", "contact_email"], ["trading_hours", "trading_hours"], ["street_address", "street_address"], ["booking_url", "booking_url"], ["menu_url", "menu_url"]];
  for (const [factName, column] of scalar) for (const value of values(facts, factName)) { const current = vendor[column] as string | null; const equal = same(current, value); const apply = !current; evidence.push({ fieldName: factName, value, applied: apply, conflict: Boolean(current) && !equal }); if (apply) { updates[column] = value; if (!appliedFields.includes(factName)) appliedFields.push(factName); } else if (!equal && !conflictFields.includes(factName)) conflictFields.push(factName); }
  const arrays: Array<[WebsiteFact["fieldName"], "services" | "area_served" | "accessibility_features"]> = [["service", "services"], ["area_served", "area_served"], ["accessibility", "accessibility_features"]];
  for (const [factName, column] of arrays) { const incoming = values(facts, factName); if (!incoming.length) continue; const current = vendor[column] as string[] | null; const equal = sameList(current, incoming); const apply = (current?.length ?? 0) === 0; for (const value of incoming) evidence.push({ fieldName: factName, value, applied: apply, conflict: !apply && !equal }); if (apply) { updates[column] = incoming; appliedFields.push(factName); } else if (!equal) conflictFields.push(factName); }
  const summary = factualSummary(facts);
  if (summary) { const equal = same(vendor.description, summary); const apply = !vendor.description; evidence.push({ fieldName: "description", value: summary, applied: apply, conflict: Boolean(vendor.description) && !equal }); if (apply) { updates.description = summary; appliedFields.push("description"); } else if (!equal) conflictFields.push("description"); }
  return { updates, facts: evidence, appliedFields, conflictFields };
}
