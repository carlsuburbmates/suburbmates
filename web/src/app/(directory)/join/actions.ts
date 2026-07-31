"use server";

import { redirect } from "next/navigation";
import { TurnstileVerificationError, verifyTurnstileToken } from "@/lib/turnstile";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

function fail(code: string, next = "/join"): never {
  redirect(`${next}${next.includes("?") ? "&" : "?"}error=${encodeURIComponent(code)}`);
}

function readBusinessFields(formData: FormData) {
  return {
    submitterName: String(formData.get("submitterName") ?? "").trim(),
    businessName: String(formData.get("businessName") ?? "").trim(),
    categorySlug: String(formData.get("categorySlug") ?? "").trim(),
    suburbSlug: String(formData.get("suburbSlug") ?? "").trim(),
    contactEmail: String(formData.get("contactEmail") ?? "").trim().toLowerCase(),
    phone: String(formData.get("phone") ?? "").trim(),
    website: String(formData.get("website") ?? "").trim(),
    streetAddress: String(formData.get("streetAddress") ?? "").trim(),
    abn: String(formData.get("abn") ?? "").replace(/\s/g, ""),
    token: String(formData.get("cf-turnstile-response") ?? ""),
    consent: formData.get("consent") === "on",
  };
}

function validBusinessFields(fields: ReturnType<typeof readBusinessFields>) {
  const { submitterName, businessName, categorySlug, suburbSlug, contactEmail, phone, website, streetAddress, abn, consent } = fields;
  return !(
    submitterName.length < 2 || submitterName.length > 120 ||
    businessName.length < 2 || businessName.length > 200 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(categorySlug) ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(suburbSlug) ||
    (contactEmail && (contactEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail))) ||
    phone.length > 40 || website.length > 500 || streetAddress.length > 500 ||
    (website && !/^https:\/\/[^\s]+$/i.test(website)) || (abn && !/^\d{11}$/.test(abn)) ||
    (!contactEmail && !phone && !website) || !consent
  );
}

async function verifyBusinessSubmission(token: string, next?: string) {
  try {
    return await verifyTurnstileToken(token, "business_submission");
  } catch (error) {
    if (error instanceof TurnstileVerificationError) fail(error.code, next);
    fail("verification", next);
  }
}

export async function submitBusinessAction(formData: FormData) {
  if (String(formData.get("companyWebsite") ?? "").trim()) redirect("/join?submitted=1");

  const fields = readBusinessFields(formData);
  const { submitterName, businessName, categorySlug, suburbSlug, contactEmail, phone, website, streetAddress, abn, token } = fields;
  const submitterEmail = String(formData.get("submitterEmail") ?? "").trim().toLowerCase();

  if (
    submitterEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submitterEmail) ||
    !validBusinessFields(fields)
  ) {
    fail("invalid");
  }

  const verification = await verifyBusinessSubmission(token);

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.rpc("submit_business_listing_with_status", {
      p_submitter_name: submitterName,
      p_submitter_email: submitterEmail,
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

export async function submitOwnedBusinessAction(formData: FormData) {
  const next = "/join?path=owner";
  if (String(formData.get("companyWebsite") ?? "").trim()) redirect(`${next}&submitted=1`);

  const fields = readBusinessFields(formData);
  const relationshipExplanation = String(formData.get("relationshipExplanation") ?? "").trim();
  if (!validBusinessFields(fields) || relationshipExplanation.length < 10 || relationshipExplanation.length > 1000) {
    redirect(`${next}&error=invalid`);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) redirect(`/login?next=${encodeURIComponent(next)}`);
  const verification = await verifyBusinessSubmission(fields.token, next);

  const { error } = await supabase.rpc("submit_owned_business_candidate_for_current_user", {
    p_submitter_name: fields.submitterName,
    p_business_name: fields.businessName,
    p_category_slug: fields.categorySlug,
    p_suburb_slug: fields.suburbSlug,
    p_contact_email: fields.contactEmail,
    p_phone: fields.phone || null,
    p_website: fields.website || null,
    p_street_address: fields.streetAddress || null,
    p_abn: fields.abn || null,
    p_relationship_explanation: relationshipExplanation,
    p_turnstile_hostname: verification.hostname,
    p_turnstile_action: verification.action,
  });
  if (error) {
    if (error.code === "23505" || error.message.includes("matching listing")) redirect(`${next}&error=duplicate`);
    if (error.message.includes("Too many recent submissions")) redirect(`${next}&error=rate_limit`);
    redirect(`${next}&error=submit`);
  }

  redirect(`${next}&submitted=1`);
}
