"use server";

import { redirect } from "next/navigation";
import { TurnstileVerificationError, verifyTurnstileToken } from "@/lib/turnstile";
import { createAdminClient } from "@/utils/supabase/admin";
import { recordDirectoryObservabilityEvent } from "@/lib/directory-observability";

const topics = new Set([
  "general",
  "listing_correction",
  "claim_help",
  "privacy",
  "technical",
  "partnership",
  "other",
]);

function fail(code: string): never {
  redirect(`/contact?error=${encodeURIComponent(code)}`);
}

export async function submitContactAction(formData: FormData) {
  const honeypot = String(formData.get("website") ?? "").trim();

  // Automated submissions receive the same outward success response but are
  // not persisted and do not consume operator time.
  if (honeypot) {
    redirect("/contact?sent=1");
  }

  const topic = String(formData.get("topic") ?? "");
  const requesterName = String(formData.get("requesterName") ?? "").trim();
  const requesterEmail = String(formData.get("requesterEmail") ?? "").trim().toLowerCase();
  const businessName = String(formData.get("businessName") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const consent = formData.get("consent") === "on";
  const token = String(formData.get("cf-turnstile-response") ?? "");

  if (
    !topics.has(topic) || requesterName.length < 2 || requesterName.length > 120 ||
    requesterEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requesterEmail) ||
    businessName.length > 200 || message.length < 10 || message.length > 4000 || !consent
  ) {
    fail("invalid");
  }

  let verification: { hostname: string; action: string };
  try {
    verification = await verifyTurnstileToken(token, "contact");
  } catch (error) {
    if (error instanceof TurnstileVerificationError) fail(error.code);
    fail("verification");
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.rpc("submit_contact_request", {
      p_topic: topic,
      p_requester_name: requesterName,
      p_requester_email: requesterEmail,
      p_business_name: businessName || null,
      p_message: message,
      p_turnstile_hostname: verification.hostname,
      p_turnstile_action: verification.action,
    });
    if (error) {
      if (error.message.includes("Too many recent requests")) fail("rate_limit");
      fail("submit");
    }
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    fail("submit");
  }

  await recordDirectoryObservabilityEvent("contact_request_completed");
  redirect("/contact?sent=1");
}
