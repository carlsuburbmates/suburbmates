"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { runtimeEnv } from "@/lib/runtime-env";
import { createAdminClient } from "@/utils/supabase/admin";

const topics = new Set([
  "general",
  "listing_correction",
  "claim_help",
  "privacy",
  "technical",
  "partnership",
  "other",
]);

type TurnstileResult = {
  success?: boolean;
  hostname?: string;
  action?: string;
  "error-codes"?: string[];
};

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

  const turnstileSecret = runtimeEnv("TURNSTILE_SECRET_KEY");
  if (!turnstileSecret || !token) {
    fail("verification");
  }

  const requestHeaders = await headers();
  const remoteIp = requestHeaders.get("cf-connecting-ip");
  const verificationBody = new URLSearchParams({
    secret: turnstileSecret,
    response: token,
    idempotency_key: randomUUID(),
  });
  if (remoteIp) verificationBody.set("remoteip", remoteIp);

  let verification: TurnstileResult;
  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body: verificationBody, cache: "no-store" },
    );
    verification = (await response.json()) as TurnstileResult;
  } catch {
    fail("verification_unavailable");
  }

  const allowedHostnames = new Set(
    (runtimeEnv("CONTACT_ALLOWED_HOSTNAMES") ?? "suburbmates.com.au")
      .split(",")
      .map((hostname) => hostname.trim().toLowerCase())
      .filter(Boolean),
  );
  const isOfficialTestMode =
    runtimeEnv("TURNSTILE_TEST_MODE") === "true" &&
    turnstileSecret === "1x0000000000000000000000000000000AA";
  if (
    verification.success !== true ||
    (!isOfficialTestMode && (
      verification.action !== "contact" || !verification.hostname ||
      !allowedHostnames.has(verification.hostname.toLowerCase())
    ))
  ) {
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
      p_turnstile_hostname: isOfficialTestMode ? "cloudflare-official-test" : verification.hostname,
      p_turnstile_action: isOfficialTestMode ? "contact" : verification.action,
    });
    if (error) {
      if (error.message.includes("Too many recent requests")) fail("rate_limit");
      fail("submit");
    }
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    fail("submit");
  }

  redirect("/contact?sent=1");
}
