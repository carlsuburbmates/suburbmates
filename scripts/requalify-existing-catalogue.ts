import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { qualifyExistingCatalogueListing, type ExistingCatalogueListing } from "../web/src/lib/automation/existing-catalogue-requalification";

const policyVersion = "existing-catalogue-v1";
const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !secret) throw new Error("Missing server-side Supabase credentials.");
if (process.env.ALLOW_CATALOGUE_REQUALIFICATION !== "true") {
  throw new Error("Refusing to write requalification evidence. Set ALLOW_CATALOGUE_REQUALIFICATION=true after reviewing the run scope.");
}

const supabase = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

type VendorRow = {
  id: string;
  business_name: string;
  street_address: string | null;
  contact_email: string | null;
  phone: string | null;
  website: string | null;
  listing_source: string | null;
  source_url: string | null;
  source_checked_on: string | null;
  category_slug: string | null;
  suburb_slug: string | null;
  updated_at: string;
};

async function main() {
  const [vendors, categories, suburbs] = await Promise.all([loadPublishedVendors(), loadSlugs("categories"), loadSlugs("suburbs")]);
  const fingerprint = createHash("sha256").update(JSON.stringify(vendors.map((vendor) => [vendor.id, vendor.updated_at]))).digest("hex");
  const { data: existing, error: existingError } = await supabase
    .from("existing_catalogue_requalification_runs")
    .select("id, status, qualified_count, exception_count")
    .eq("policy_version", policyVersion)
    .eq("catalogue_fingerprint", fingerprint)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing?.status === "completed") {
    console.log(`Existing catalogue already requalified: ${existing.qualified_count} qualified, ${existing.exception_count} exceptions.`);
    return;
  }

  const run = existing ?? await createRun(fingerprint, vendors.length);
  const existingListings = vendors.map(toExistingListing);
  const records = vendors.map((vendor) => {
    const qualification = qualifyExistingCatalogueListing(toQualificationInput(vendor), { allowedSuburbs: suburbs, allowedCategories: categories, existingListings });
    return {
      run_id: run.id,
      vendor_id: vendor.id,
      qualification_outcome: qualification.outcome,
      qualification_reasons: qualification.reasons,
      normalized_data: qualification.normalized,
      duplicate_vendor_id: qualification.duplicateVendorId,
      exception_status: "open",
    };
  });

  try {
    for (let index = 0; index < records.length; index += 100) {
      const { error } = await supabase.from("existing_catalogue_requalification_records")
        .upsert(records.slice(index, index + 100), { onConflict: "run_id,vendor_id", ignoreDuplicates: true });
      if (error) throw error;
    }
    const qualifiedCount = records.filter((record) => record.qualification_outcome === "qualified").length;
    const exceptionCount = records.length - qualifiedCount;
    const completedAt = new Date().toISOString();
    const { error: updateError } = await supabase.from("existing_catalogue_requalification_runs")
      .update({ status: "completed", qualified_count: qualifiedCount, exception_count: exceptionCount, completed_at: completedAt, error_message: null })
      .eq("id", run.id);
    if (updateError) throw updateError;
    const { error: auditError } = await supabase.from("audit_events").insert({
      actor_type: "service",
      action: "existing_catalogue_requalification_completed",
      entity_type: "existing_catalogue_requalification_run",
      entity_id: run.id,
      reason: "Private deterministic evidence pass completed; listing visibility and lifecycle were unchanged.",
      after_data: { policy_version: policyVersion, input_count: records.length, qualified_count: qualifiedCount, exception_count: exceptionCount, publication_unchanged: true },
      correlation_id: run.correlation_id,
    });
    if (auditError) throw auditError;
    console.log(`Existing catalogue requalification completed: ${qualifiedCount} qualified, ${exceptionCount} exceptions. No listing state changed.`);
  } catch (error) {
    await supabase.from("existing_catalogue_requalification_runs")
      .update({ status: "failed", error_message: error instanceof Error ? error.message : "Catalogue requalification failed.", completed_at: new Date().toISOString() })
      .eq("id", run.id);
    throw error;
  }
}

async function loadPublishedVendors(): Promise<VendorRow[]> {
  const vendors: VendorRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("vendors")
      .select("id, business_name, street_address, contact_email, phone, website, listing_source, source_url, source_checked_on, category_slug, suburb_slug, updated_at")
      .eq("is_published", true).order("id").range(from, from + 999);
    if (error) throw error;
    vendors.push(...(data as VendorRow[]));
    if (data.length < 1000) return vendors;
  }
}

async function loadSlugs(table: "categories" | "suburbs") {
  const { data, error } = await supabase.from(table).select("slug");
  if (error) throw error;
  return new Set(data.map((row) => row.slug));
}

async function createRun(fingerprint: string, inputCount: number) {
  const { data, error } = await supabase.from("existing_catalogue_requalification_runs")
    .insert({ policy_version: policyVersion, catalogue_fingerprint: fingerprint, input_count: inputCount, status: "processing" })
    .select("id, correlation_id").single();
  if (error || !data) throw error ?? new Error("Could not start existing catalogue requalification.");
  return data;
}

function toExistingListing(vendor: VendorRow) {
  return { id: vendor.id, businessName: vendor.business_name, streetAddress: vendor.street_address, phone: vendor.phone, website: vendor.website };
}

function toQualificationInput(vendor: VendorRow): ExistingCatalogueListing {
  return { ...toExistingListing(vendor), listingSource: vendor.listing_source, sourceUrl: vendor.source_url, sourceCheckedOn: vendor.source_checked_on, categorySlug: vendor.category_slug, suburbSlug: vendor.suburb_slug, contactEmail: vendor.contact_email };
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
