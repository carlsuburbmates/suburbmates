import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type Keys = { name: string; api_key: string }[];

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const serviceKey = process.env.SUPABASE_SECRET_KEY;
const evidencePath = process.env.D017_EVIDENCE_PATH;

if (!url || !anonKey || !serviceKey || process.env.D017_CONTROLLED_ACCEPTANCE !== "true") {
  throw new Error("D-017 acceptance requires explicit disposable-project credentials and D017_CONTROLLED_ACCEPTANCE=true.");
}
if (url.includes("lqxohgpignkqqfkkbzsn") || url.includes("suburbmates.com.au")) {
  throw new Error("D-017 acceptance refuses the production Supabase project.");
}

const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const anonymous = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
const suffix = `d017-${Date.now()}-${randomUUID().slice(0, 8)}`;
const password = "D017-controlled-acceptance-password-123!";
const emails = {
  owner: `${suffix}-owner@example.test`,
  other: `${suffix}-other@example.test`,
  operator: `${suffix}-operator@example.test`,
  submitter: `${suffix}-submitter@example.test`,
  access: `${suffix}-access@example.test`,
  browser: `${suffix}-browser@example.test`,
};
const evidence: string[] = [];

function pass(label: string) {
  evidence.push(label);
  console.log(`PASS ${label}`);
}

async function mustFail(label: string, task: () => Promise<{ error: unknown }>) {
  const result = await task();
  assert(result.error, `${label}: expected a rejected request`);
  pass(label);
}

async function createUser(email: string) {
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  assert.ifError(error);
  assert(data.user);
  return data.user.id;
}

async function signedIn(email: string): Promise<SupabaseClient> {
  const client = createClient(url!, anonKey!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await client.auth.signInWithPassword({ email, password });
  assert.ifError(error);
  return client;
}

async function insertVendor(values: Record<string, unknown>) {
  const { data, error } = await service.from("vendors").insert(values).select("id, slug, is_published, ownership_status").single();
  assert.ifError(error);
  assert(data);
  return data as { id: string; slug: string; is_published: boolean; ownership_status: string };
}

async function getVendor(id: string) {
  const { data, error } = await service.from("vendors").select("id, business_name, owner_id, is_claimed, is_published, listing_status, ownership_status, description").eq("id", id).single();
  assert.ifError(error);
  assert(data);
  return data;
}

async function main() {
  const ownerId = await createUser(emails.owner);
  const otherId = await createUser(emails.other);
  const operatorId = await createUser(emails.operator);
  const submitterId = await createUser(emails.submitter);
  const accessId = await createUser(emails.access);
  const browserId = await createUser(emails.browser);
  const owner = await signedIn(emails.owner);
  const other = await signedIn(emails.other);
  const operator = await signedIn(emails.operator);
  const submitter = await signedIn(emails.submitter);

  const firstCode = await service.auth.admin.generateLink({ type: "magiclink", email: emails.access });
  assert.ifError(firstCode.error);
  const firstToken = firstCode.data.properties?.email_otp;
  assert.match(firstToken ?? "", /^\d{6,8}$/);
  const latestCode = await service.auth.admin.generateLink({ type: "magiclink", email: emails.access });
  assert.ifError(latestCode.error);
  const latestToken = latestCode.data.properties?.email_otp;
  assert.match(latestToken ?? "", /^\d{6,8}$/);
  const codeClient = createClient(url!, anonKey!, { auth: { persistSession: false, autoRefreshToken: false } });
  await mustFail("superseded email code is rejected", () => codeClient.auth.verifyOtp({ email: emails.access, token: firstToken!, type: "email" }));
  const validCode = await codeClient.auth.verifyOtp({ email: emails.access, token: latestToken!, type: "email" });
  assert.ifError(validCode.error);
  assert(validCode.data.session);
  await mustFail("reused email code is rejected", () => codeClient.auth.verifyOtp({ email: emails.access, token: latestToken!, type: "email" }));
  const recovery = await service.auth.admin.generateLink({ type: "recovery", email: emails.access });
  assert.ifError(recovery.error);
  const recoveryToken = recovery.data.properties?.email_otp;
  assert.match(recoveryToken ?? "", /^\d{6,8}$/);
  const recoveryClient = createClient(url!, anonKey!, { auth: { persistSession: false, autoRefreshToken: false } });
  const recoverySession = await recoveryClient.auth.verifyOtp({ email: emails.access, token: recoveryToken!, type: "recovery" });
  assert.ifError(recoverySession.error);
  assert.ifError((await recoveryClient.auth.updateUser({ password: "D017-recovered-password-123!" })).error);
  const recoveredLogin = await recoveryClient.auth.signInWithPassword({ email: emails.access, password: "D017-recovered-password-123!" });
  assert.ifError(recoveredLogin.error);
  const expiredCode = await service.auth.admin.generateLink({ type: "magiclink", email: emails.access });
  assert.ifError(expiredCode.error);
  const expiredToken = expiredCode.data.properties?.email_otp;
  assert.match(expiredToken ?? "", /^\d{6,8}$/);
  await new Promise((resolve) => setTimeout(resolve, 1_250));
  const expiredClient = createClient(url!, anonKey!, { auth: { persistSession: false, autoRefreshToken: false } });
  await mustFail("expired email code is rejected", () => expiredClient.auth.verifyOtp({ email: emails.access, token: expiredToken!, type: "email" }));
  pass("password sign-in, reset recovery, valid, expired, superseded and reused email-code paths work against hosted Auth");

  const categorySlug = `${suffix}-category`;
  const suburbSlug = `${suffix}-suburb`;
  assert.ifError((await service.from("categories").insert({ slug: categorySlug, name: "D-017 controlled category" })).error);
  assert.ifError((await service.from("suburbs").insert({ slug: suburbSlug, name: "D-017 controlled suburb", postcodes: ["3000"] })).error);
  assert.ifError((await service.from("operator_users").insert({ user_id: operatorId, is_active: true, notes: "D-017 synthetic operator" })).error);
  pass("isolated synthetic identities, taxonomy and active operator created");

  const claimVendor = await insertVendor({
    business_name: "D-017 claim fixture", category_slug: categorySlug, suburb_slug: suburbSlug,
    contact_email: emails.owner, source_key: `${suffix}:claim`, listing_source: "operator_added",
    is_published: true, listing_status: "published", ownership_status: "unclaimed",
  });
  await mustFail("anonymous claim discovery is denied", () => anonymous.rpc("list_claimable_vendors_for_current_email"));
  const otherListings = await other.rpc("list_claimable_vendors_for_current_email");
  assert.ifError(otherListings.error);
  assert(!otherListings.data?.some((row: { id: string }) => row.id === claimVendor.id));
  await mustFail("non-matching account cannot submit a claim", () => other.rpc("submit_claim_for_current_email", { p_vendor_id: claimVendor.id, p_claimant_note: "I am not the recorded contact for this business.", p_abn: null }));
  const eligible = await owner.rpc("list_claimable_vendors_for_current_email");
  assert.ifError(eligible.error);
  assert(eligible.data?.some((row: { id: string }) => row.id === claimVendor.id));
  const claim = await owner.rpc("submit_claim_for_current_email", { p_vendor_id: claimVendor.id, p_claimant_note: "I am the authorised owner and use this listed business email.", p_abn: "12345678901" });
  assert.ifError(claim.error);
  const claimId = (claim.data as Array<{ claim_request_id: string }>)[0]?.claim_request_id;
  assert(claimId);
  const pendingVendor = await getVendor(claimVendor.id);
  assert.equal(pendingVendor.owner_id, null);
  assert.equal(pendingVendor.is_claimed, false);
  assert.equal(pendingVendor.is_published, true);
  assert.equal(pendingVendor.ownership_status, "claim_pending");
  pass("claim success stays pending and public listing remains unchanged");
  await mustFail("non-operator cannot decide a claim", () => owner.rpc("ops_decide_claim", { p_claim_request_id: claimId, p_action: "approve", p_reason: "not permitted" }));
  assert.ifError((await operator.rpc("ops_decide_claim", { p_claim_request_id: claimId, p_action: "needs_information", p_reason: "Provide a current authority detail." })).error);
  assert.ifError((await owner.rpc("withdraw_current_owner_claim", { p_claim_request_id: claimId })).error);
  const withdrawn = await getVendor(claimVendor.id);
  assert.equal(withdrawn.owner_id, null);
  assert.equal(withdrawn.is_published, true);
  assert.equal(withdrawn.ownership_status, "unclaimed");
  pass("claim recovery withdrawal restores availability without public mutation");

  const approvedClaim = await owner.rpc("submit_claim_for_current_email", { p_vendor_id: claimVendor.id, p_claimant_note: "I remain the authorised owner and request review.", p_abn: null });
  assert.ifError(approvedClaim.error);
  const approvedClaimId = (approvedClaim.data as Array<{ claim_request_id: string }>)[0]?.claim_request_id;
  assert(approvedClaimId);
  assert.ifError((await operator.rpc("ops_decide_claim", { p_claim_request_id: approvedClaimId, p_action: "approve", p_reason: "Synthetic acceptance evidence reviewed." })).error);
  const ownedVendor = await getVendor(claimVendor.id);
  assert.equal(ownedVendor.owner_id, ownerId);
  assert.equal(ownedVendor.is_claimed, true);
  assert.equal(ownedVendor.is_published, true);
  pass("operator claim approval changes ownership only and records an auditable decision");

  await mustFail("non-owner cannot submit a profile change", () => other.rpc("submit_vendor_profile_change", {
    p_vendor_id: claimVendor.id, p_business_name: "Unauthorised name", p_street_address: null, p_contact_email: emails.other,
    p_phone: null, p_website: null, p_description: null, p_submitter_note: null,
  }));
  const profile = await owner.rpc("submit_vendor_profile_change", {
    p_vendor_id: claimVendor.id, p_business_name: "D-017 approved profile fixture", p_street_address: "1 Controlled Lane",
    p_contact_email: emails.owner, p_phone: "0390000000", p_website: "https://example.test", p_description: "Controlled profile change fixture.", p_submitter_note: "Synthetic profile change.",
  });
  assert.ifError(profile.error);
  const profileId = (profile.data as Array<{ change_request_id: string }>)[0]?.change_request_id;
  assert(profileId);
  assert.equal((await getVendor(claimVendor.id)).business_name, "D-017 claim fixture");
  await mustFail("non-operator cannot decide a profile change", () => owner.rpc("ops_decide_profile_change", { p_change_request_id: profileId, p_action: "approve", p_reason: "not permitted" }));
  assert.ifError((await operator.rpc("ops_decide_profile_change", { p_change_request_id: profileId, p_action: "approve", p_reason: "Synthetic acceptance decision." })).error);
  assert.equal((await getVendor(claimVendor.id)).business_name, "D-017 approved profile fixture");
  pass("profile-change pending, permission, approval and public-update boundaries hold");

  const mediaPath = `proposals/${claimVendor.id}/${randomUUID()}.png`;
  const upload = await service.storage.from("owner-media-proposals").upload(mediaPath, new Uint8Array([137, 80, 78, 71]), { contentType: "image/png", upsert: false });
  assert.ifError(upload.error);
  await mustFail("non-owner cannot propose media", () => other.rpc("submit_owner_media_proposal", { p_vendor_id: claimVendor.id, p_media_kind: "logo", p_storage_path: mediaPath, p_content_type: "image/png", p_byte_size: 4, p_checksum_sha256: "a".repeat(64), p_alt_text: "Synthetic logo", p_source_basis: "I have permission to use this controlled image." }));
  const media = await owner.rpc("submit_owner_media_proposal", { p_vendor_id: claimVendor.id, p_media_kind: "logo", p_storage_path: mediaPath, p_content_type: "image/png", p_byte_size: 4, p_checksum_sha256: "a".repeat(64), p_alt_text: "Synthetic logo", p_source_basis: "I have permission to use this controlled image." });
  assert.ifError(media.error);
  const mediaId = media.data as string;
  assert(mediaId);
  assert.ifError((await operator.rpc("ops_decide_media_proposal", { p_proposal_id: mediaId, p_action: "approve", p_reason: "Controlled private media approved." })).error);
  const publicMedia = await anonymous.rpc("list_public_vendor_media", { p_vendor_id: claimVendor.id });
  assert.ifError(publicMedia.error);
  assert((publicMedia.data as Array<{ media_id: string }>).some((row) => row.media_id === mediaId));
  assert.ifError((await operator.rpc("ops_decide_media_proposal", { p_proposal_id: mediaId, p_action: "remove", p_reason: "Controlled teardown of approved media." })).error);
  assert.equal((await getVendor(claimVendor.id)).is_published, true);
  pass("private media moderation and removal preserve listing lifecycle and ownership");

  const community = await service.rpc("submit_business_listing_with_status", {
    p_submitter_name: "D-017 community fixture", p_submitter_email: emails.submitter, p_business_name: "D-017 community submission",
    p_category_slug: categorySlug, p_suburb_slug: suburbSlug, p_contact_email: `${suffix}-community-contact@example.test`, p_phone: null,
    p_website: "https://example.test", p_street_address: null, p_abn: null, p_turnstile_hostname: "cloudflare-official-test", p_turnstile_action: "business_submission",
  });
  assert.ifError(community.error);
  const communityVendorId = community.data as string;
  const communityVendor = await getVendor(communityVendorId);
  assert.equal(communityVendor.is_published, false);
  assert.equal(communityVendor.ownership_status, "unclaimed");
  const privateStatuses = await submitter.rpc("list_current_business_submission_statuses");
  assert.ifError(privateStatuses.error);
  assert((privateStatuses.data as Array<{ business_name: string }>).some((row) => row.business_name === "D-017 community submission"));
  await mustFail("anonymous callers cannot read private submission status", () => anonymous.rpc("list_current_business_submission_statuses"));
  const duplicate = await service.rpc("submit_business_listing_with_status", {
    p_submitter_name: "D-017 community fixture", p_submitter_email: emails.submitter, p_business_name: "D-017 community submission",
    p_category_slug: categorySlug, p_suburb_slug: suburbSlug, p_contact_email: `${suffix}-community-contact@example.test`, p_phone: null,
    p_website: "https://example.test", p_street_address: null, p_abn: null, p_turnstile_hostname: "cloudflare-official-test", p_turnstile_action: "business_submission",
  });
  assert(duplicate.error || duplicate.data === communityVendorId, "duplicate must reject or return the existing private request");
  assert.ifError((await operator.rpc("ops_set_business_submission_status", { p_vendor_id: communityVendorId, p_status: "needs_information", p_message: "Synthetic request needs one clarification." })).error);
  assert.equal((await getVendor(communityVendorId)).is_published, false);
  pass("community submission, private status, duplicate handling and moderated outcome remain private");

  const ownedCandidate = await owner.rpc("submit_owned_business_candidate_for_current_user", {
    p_submitter_name: "D-017 owner fixture", p_business_name: "D-017 owner candidate", p_category_slug: categorySlug, p_suburb_slug: suburbSlug,
    p_contact_email: `${suffix}-owner-candidate@example.test`, p_phone: "0390000001", p_website: null, p_street_address: null, p_abn: null,
    p_relationship_explanation: "I am the authorised representative for this synthetic business.", p_turnstile_hostname: "cloudflare-official-test", p_turnstile_action: "business_submission",
  });
  assert.ifError(ownedCandidate.error);
  const ownedCandidateId = (ownedCandidate.data as Array<{ vendor_id: string }>)[0]?.vendor_id;
  assert(ownedCandidateId);
  const ownedCandidateVendor = await getVendor(ownedCandidateId);
  assert.equal(ownedCandidateVendor.is_published, false);
  assert.equal(ownedCandidateVendor.owner_id, null);
  assert.equal(ownedCandidateVendor.ownership_status, "claim_pending");
  pass("owner missing-business candidate creates private candidate and pending claim without ownership or publication");

  const contact = await service.rpc("submit_contact_request", {
    p_topic: "listing_correction", p_requester_name: "D-017 reporter", p_requester_email: `${suffix}-reporter@example.test`,
    p_business_name: "D-017 approved profile fixture", p_message: "Please correct this controlled test contact record.", p_turnstile_hostname: "cloudflare-official-test", p_turnstile_action: "contact",
  });
  assert.ifError(contact.error);
  const contactId = contact.data as string;
  await mustFail("anonymous callers cannot create contact intake directly", () => anonymous.rpc("submit_contact_request", {
    p_topic: "technical", p_requester_name: "No access", p_requester_email: `${suffix}-noaccess@example.test`, p_business_name: null,
    p_message: "This must not reach the private intake.", p_turnstile_hostname: "cloudflare-official-test", p_turnstile_action: "contact",
  }));
  await mustFail("non-operator cannot resolve contact intake", () => owner.rpc("ops_decide_contact_request", { p_contact_request_id: contactId, p_status: "resolved", p_reason: "not permitted" }));
  assert.ifError((await operator.rpc("ops_decide_contact_request", { p_contact_request_id: contactId, p_status: "resolved", p_reason: "Synthetic correction resolved without public mutation." })).error);
  assert.equal((await getVendor(claimVendor.id)).business_name, "D-017 approved profile fixture");
  pass("contact success, direct-access denial, operator resolution and no automatic public mutation hold");

  await mustFail("non-operator cannot record ABN evidence", () => owner.rpc("ops_record_abn_check", {
    p_vendor_id: claimVendor.id, p_submitted_abn: "12345678901", p_abn_status: "provider_failure", p_entity_status: null, p_official_names: [], p_checked_at: new Date().toISOString(), p_error_message: "Controlled provider failure",
  }));
  assert.ifError((await operator.rpc("ops_record_abn_check", {
    p_vendor_id: claimVendor.id, p_submitted_abn: "12345678901", p_abn_status: "provider_failure", p_entity_status: null, p_official_names: [], p_checked_at: new Date().toISOString(), p_error_message: "Controlled provider failure",
  })).error);
  assert.equal((await getVendor(claimVendor.id)).is_published, true);
  pass("ABN provider-failure evidence is operator-only and does not change publication or ownership");

  const run = await service.from("candidate_handoff_runs").insert({ source: "operator", artifact_sha256: randomUUID().replaceAll("-", "").padEnd(64, "b"), artifact_url: "https://example.test/d017-artifact", status: "completed", input_count: 1, qualified_count: 0, exception_count: 1 }).select("id").single();
  assert.ifError(run.error);
  const candidate = await service.from("candidate_handoff_records").insert({ run_id: run.data.id, source_record_key: `${suffix}:candidate`, candidate_data: { name: "D-017 candidate" }, normalized_data: { name: "D-017 candidate" }, qualification_outcome: "exception", qualification_reasons: ["missing_required_evidence"] }).select("id").single();
  assert.ifError(candidate.error);
  await mustFail("non-operator cannot resolve candidate exceptions", () => owner.rpc("ops_resolve_candidate_handoff_record", { p_record_id: candidate.data.id, p_action: "acknowledge", p_operator_note: "not permitted" }));
  assert.ifError((await operator.rpc("ops_resolve_candidate_handoff_record", { p_record_id: candidate.data.id, p_action: "acknowledge", p_operator_note: "Synthetic evidence reviewed; no listing was created." })).error);
  const candidateRow = await service.from("candidate_handoff_records").select("exception_status, vendor_id").eq("id", candidate.data.id).single();
  assert.ifError(candidateRow.error);
  assert.equal(candidateRow.data.exception_status, "acknowledged");
  assert.equal(candidateRow.data.vendor_id, null);
  pass("candidate exception is private, operator-governed and never auto-publishes");

  const { data: ownerStatus, error: ownerStatusError } = await owner.rpc("list_current_owner_request_statuses");
  assert.ifError(ownerStatusError);
  assert((ownerStatus as Array<{ request_type: string }>).some((row) => row.request_type === "claim"));
  const { data: auditRows, error: auditError } = await service.from("audit_events").select("action").ilike("reason", "%Synthetic%");
  assert.ifError(auditError);
  assert((auditRows?.length ?? 0) >= 6, "controlled transitions must leave append-only audit evidence");
  pass("private owner status remains available and controlled transitions have append-only audit evidence");

  const browserVendor = await insertVendor({
    business_name: "D-017 browser claim fixture", category_slug: categorySlug, suburb_slug: suburbSlug,
    contact_email: emails.browser, source_key: `${suffix}:browser-claim`, listing_source: "operator_added",
    is_published: true, listing_status: "published", ownership_status: "unclaimed",
  });
  const result = { environment: new URL(url!).hostname, fixturePrefix: suffix, users: { ownerId, otherId, operatorId, submitterId, accessId, browserId }, browser: { ownerEmail: emails.browser, ownerPassword: password, operatorEmail: emails.operator, operatorPassword: password, vendor: browserVendor }, workflowIds: { profileChangeId: profileId, contactRequestId: contactId }, vendor: { id: claimVendor.id, slug: claimVendor.slug }, assertions: evidence, teardown: "Delete disposable Supabase project nehccskyczmrhrzaudqy after browser and production-smoke evidence is captured." };
  if (evidencePath) await writeFile(path.resolve(evidencePath), `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
