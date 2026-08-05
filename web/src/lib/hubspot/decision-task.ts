export type DecisionInboxKind = "listing" | "claim" | "profile" | "contact" | "candidate" | "catalogue" | "system";
export type DecisionInboxPriority = "act_now" | "needs_decision" | "later_review";

export type DecisionInboxItem = {
  workId: string;
  kind: DecisionInboxKind;
  priority: DecisionInboxPriority;
  href: string;
  title?: string | null;
  topic?: string | null;
};

export type HubSpotTaskPayload = {
  workId: string;
  fingerprint: string;
  properties: {
    hs_timestamp: string;
    hs_task_subject: string;
    hs_task_body: string;
    hs_task_status: "NOT_STARTED" | "COMPLETED";
    hs_task_priority: "HIGH" | "MEDIUM" | "LOW";
    hs_task_type: "TODO";
    hubspot_owner_id: string;
  };
};

const allowedTopics = new Set(["general", "listing_correction", "claim_help", "privacy", "technical", "partnership", "other"]);

export function makeHubSpotDecisionTask(item: DecisionInboxItem, ownerId: string, baseUrl: string, timestamp: string): HubSpotTaskPayload {
  if (!item.href.startsWith("/ops/")) throw new Error("HubSpot Decision Inbox links must lead to protected Ops.");
  const url = `${baseUrl.replace(/\/$/, "")}${item.href}`;
  const subject = decisionSubject(item);
  const priority = item.priority === "act_now" ? "HIGH" : item.priority === "later_review" ? "LOW" : "MEDIUM";
  const fingerprint = JSON.stringify([item.kind, item.priority, subject, url]);

  return {
    workId: item.workId,
    fingerprint,
    properties: {
      hs_timestamp: timestamp,
      hs_task_subject: subject,
      hs_task_body: `Open the protected SuburbMates decision: ${url}`,
      hs_task_status: "NOT_STARTED",
      hs_task_priority: priority,
      hs_task_type: "TODO",
      hubspot_owner_id: ownerId,
    },
  };
}

function decisionSubject(item: DecisionInboxItem): string {
  const businessName = safeBusinessName(item.title);
  switch (item.kind) {
    case "listing": return businessName ? `Review listing — ${businessName}` : "Review listing";
    case "claim": return businessName ? `Review ownership claim — ${businessName}` : "Review ownership claim";
    case "profile": return businessName ? `Review profile change — ${businessName}` : "Review profile change";
    case "contact": return `Review ${safeContactTopic(item.topic)} request`;
    case "candidate": return "Review possible duplicate";
    case "catalogue": return "Review older possible duplicate";
    case "system": return businessName ? `Investigate system issue — ${businessName}` : "Investigate system issue";
  }
}

function safeBusinessName(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.replace(/\s+/g, " ").trim().slice(0, 180);
  return normalized || null;
}

function safeContactTopic(value: string | null | undefined): string {
  if (!value || !allowedTopics.has(value)) return "contact";
  return value.replaceAll("_", " ");
}
