export type WorkPriority = "act_now" | "needs_decision" | "later_review";

export type WorkItem = {
  id: string;
  priority: WorkPriority;
  kind: "listing" | "claim" | "profile" | "contact" | "candidate" | "catalogue" | "system";
  title: string;
  decision: string;
  evidence: string;
  href: string;
  createdAt: string | null;
};

type Listing = { vendor_id: string; business_name: string; updated_at: string };
type Claim = { claim_request_id: string; business_name: string; claim_status: string; created_at: string };
type Profile = { change_request_id: string; business_name: string; proposed_changes: Record<string, unknown>; created_at: string };
type Contact = { contact_request_id: string; topic: string; business_name: string | null; requester_name: string; created_at: string };
type Candidate = { record_id: string; candidate_data: Record<string, unknown>; qualification_reasons: string[]; created_at: string };
type Catalogue = { record_id: string; vendor_id: string; business_name: string; qualification_reasons: string[]; created_at: string };
type Health = { integration_name: string; status: string; updated_at: string };
type Job = { job_id: string; job_type: string; status: string; created_at: string };

export type WorkSource = {
  listings: Listing[];
  claims: Claim[];
  profiles: Profile[];
  contacts: Contact[];
  candidates: Candidate[];
  catalogue: Catalogue[];
  health: Health[];
  jobs: Job[];
};

export const workPriorityOrder: WorkPriority[] = ["act_now", "needs_decision", "later_review"];

export function composeWorkItems(source: WorkSource): WorkItem[] {
  const items: WorkItem[] = [
    ...source.health
      .filter((item) => ["failed", "degraded", "stale"].includes(item.status))
      .map((item) => ({ id: `health:${item.integration_name}`, priority: "act_now" as const, kind: "system" as const, title: `${label(item.integration_name)} needs technical help`, decision: "Ask for technical help", evidence: "The latest monitored check needs attention. Nothing was changed automatically.", href: `/ops/system#health-${item.integration_name}`, createdAt: item.updated_at })),
    ...source.jobs
      .filter((item) => item.status === "failed")
      .map((item) => ({ id: `job:${item.job_id}`, priority: "act_now" as const, kind: "system" as const, title: `${label(item.job_type)} did not complete`, decision: "Ask for technical help", evidence: "This bounded automated job failed. No business state changed automatically.", href: `/ops/system#job-${item.job_id}`, createdAt: item.created_at })),
    ...source.listings.map((item) => ({ id: `listing:${item.vendor_id}`, priority: "needs_decision" as const, kind: "listing" as const, title: item.business_name, decision: "Make a listing decision", evidence: "Review the public facts and choose the permitted listing outcome.", href: `/ops/listings/${item.vendor_id}`, createdAt: item.updated_at })),
    ...source.claims.map((item) => ({ id: `claim:${item.claim_request_id}`, priority: "needs_decision" as const, kind: "claim" as const, title: item.business_name, decision: item.claim_status === "needs_information" ? "Review ownership evidence" : "Review an ownership claim", evidence: "A claim changes ownership only; it never publishes or edits the listing.", href: `/ops/claims/${item.claim_request_id}`, createdAt: item.created_at })),
    ...source.profiles.map((item) => ({ id: `profile:${item.change_request_id}`, priority: "needs_decision" as const, kind: "profile" as const, title: item.business_name, decision: "Review a proposed profile update", evidence: changedFields(item.proposed_changes), href: `/ops/profile-edits/${item.change_request_id}`, createdAt: item.created_at })),
    ...source.contacts.map((item) => ({ id: `contact:${item.contact_request_id}`, priority: "needs_decision" as const, kind: "contact" as const, title: item.business_name ?? item.requester_name, decision: `Review ${label(item.topic)} request`, evidence: "This private request does not change a listing by itself.", href: `/ops/contact/${item.contact_request_id}`, createdAt: item.created_at })),
    ...source.candidates
      .filter(isOnlyPossibleDuplicate)
      .map((item) => ({ id: `candidate:${item.record_id}`, priority: "needs_decision" as const, kind: "candidate" as const, title: candidateName(item.candidate_data), decision: "Review a possible duplicate discovery", evidence: "This is private discovery evidence, not a Business or a publication decision.", href: `/ops/candidates/${item.record_id}`, createdAt: item.created_at })),
    ...source.catalogue
      .filter(isOnlyPossibleDuplicate)
      .map((item) => ({ id: `catalogue:${item.record_id}`, priority: "later_review" as const, kind: "catalogue" as const, title: item.business_name, decision: "Review an older possible duplicate", evidence: "This historic evidence needs a later listing decision; it is not urgent work.", href: `/ops/listings/${item.vendor_id}`, createdAt: item.created_at })),
  ];

  return items.sort((left, right) => {
    const priority = workPriorityOrder.indexOf(left.priority) - workPriorityOrder.indexOf(right.priority);
    if (priority) return priority;
    return Date.parse(right.createdAt ?? "") - Date.parse(left.createdAt ?? "");
  });
}

function isOnlyPossibleDuplicate(item: { qualification_reasons: string[] }) {
  return item.qualification_reasons.length === 1 && item.qualification_reasons[0] === "possible_duplicate";
}

function candidateName(candidate: Record<string, unknown>) {
  return typeof candidate.business_name === "string" && candidate.business_name.trim() ? candidate.business_name : "Possible business from an approved source";
}

function changedFields(values: Record<string, unknown>) {
  const fields = Object.keys(values).filter((key) => values[key] !== undefined);
  return fields.length ? `Proposed: ${fields.map(label).join(", ")}.` : "Review the proposed public details.";
}

function label(value: string) {
  return value === "openstreetmap_source" ? "OpenStreetMap source" : value.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}
