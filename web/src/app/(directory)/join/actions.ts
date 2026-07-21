"use server";

import { redirect } from "next/navigation";
import { TurnstileVerificationError, verifyTurnstileToken } from "@/lib/turnstile";
import { createAdminClient } from "@/utils/supabase/admin";

function fail(code: string): never {
  redirect(`/join?error=${encodeURIComponent(code)}`);
}

export async function submitBusinessAction(formData: FormData) {
  if (String(formData.get("companyWebsite") ?? "").trim()) redirect("/join?submitted=1");

  const submitterName = String(formData.get("submitterName") ?? "").trim();
  const businessName = String(formData.get("businessName") ?? "").trim();
  const categorySlug = String(formData.get("categorySlug") ?? "").trim();
  const suburbSlug = String(formData.get("suburbSlug") ?? "").trim();
  const contactEmail = String(formData.get("contactEmail") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const website = String(formData.get("website") ?? "").trim();
  const streetAddress = String(formData.get("streetAddress") ?? "").trim();
  const abn = String(formData.get("abn") ?? "").replace(/\s/g, "");
  const token = String(formData.get("cf-turnstile-response") ?? "");
  const consent = formData.get("consent") === "on";

  if (
    submitterName.length < 2 || submitterName.length > 120 ||
    businessName.length < 2 || businessName.length > 200 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(categorySlug) ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(suburbSlug) ||
    (contactEmail && (contactEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail))) ||
    phone.length > 40 || website.length > 500 || streetAddress.length > 500 ||
    (website && !/^https:\/\/[^\s]+$/i.test(website)) || (abn && !/^\d{11}$/.test(abn)) ||
    (!contactEmail && !phone && !website) || !consent
  ) {
    fail("invalid");
  }

  let verification: { hostname: string; action: string };
  try {
    verification = await verifyTurnstileToken(token, "business_submission");
  } catch (error) {
    if (error instanceof TurnstileVerificationError) fail(error.code);
    fail("verification");
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.rpc("submit_business_listing", {
      p_submitter_name: submitterName,
      p_business_name: businessName,
      p_category_slug: categorySlug,
      p_suburb_slug: suburbSlug,
      p_contact_email: contactEmail,
      p_phone: phone || null,
      p_website: website || null,
      p_street_address: streetAddress || null,
      p_abn: abn || null,
      p_turnstile_hostname: verification.hostname,
      p_turnstile_action: verification.action,
    });
    if (error) {
      if (error.code === "23505" || error.message.includes("matching listing")) fail("duplicate");
      if (error.message.includes("Too many recent submissions")) fail("rate_limit");
      fail("submit");
    }
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    fail("submit");
  }

  redirect("/join?submitted=1");
}
