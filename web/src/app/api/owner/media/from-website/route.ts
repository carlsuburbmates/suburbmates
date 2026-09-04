import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

const MAX_BYTES = 2 * 1024 * 1024;
const kinds = new Set(["logo", "listing_image"]);
const sameHost = (left: string, right: string) => left.replace(/^www\./, "").toLowerCase() === right.replace(/^www\./, "").toLowerCase();

export async function POST(request: Request) {
  const form = await request.formData(); const vendorId = String(form.get("vendorId") ?? ""); const mediaKind = String(form.get("mediaKind") ?? ""); const altText = String(form.get("altText") ?? "").trim(); const originUrl = String(form.get("originUrl") ?? "").trim(); const sourceBasis = String(form.get("sourceBasis") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(vendorId) || !kinds.has(mediaKind) || altText.length < 2 || altText.length > 160 || sourceBasis.length < 10 || sourceBasis.length > 1000) return error("Enter an image URL, description and rights attestation.", 400);
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) return error("Sign in to propose media.", 401);
  const { data: owned, error: ownedError } = await supabase.rpc("list_current_owner_vendors_with_channels"); const vendor = (owned ?? []).find((item: { id: string }) => item.id === vendorId) as { website?: string | null } | undefined;
  if (ownedError || !vendor?.website) return error("A claimed listing with a recorded website is required.", 403);
  let requested: URL; let recorded: URL; try { requested = new URL(originUrl); recorded = new URL(vendor.website); if (requested.protocol !== "https:" || requested.username || requested.password || !sameHost(requested.hostname, recorded.hostname)) throw new Error(); } catch { return error("Use an HTTPS image URL from the recorded business website.", 400); }
  const downloaded = await fetchImage(requested, recorded.hostname); if (!downloaded) return error("The website image could not be retrieved safely. Upload the file directly instead.", 400);
  const extension = downloaded.type === "image/jpeg" ? "jpg" : downloaded.type === "image/png" ? "png" : "webp"; const storagePath = `proposals/${vendorId}/${crypto.randomUUID()}.${extension}`; const admin = createAdminClient();
  const { error: uploadError } = await admin.storage.from("owner-media-proposals").upload(storagePath, downloaded.bytes, { contentType: downloaded.type, upsert: false }); if (uploadError) return error("The image could not be saved. Please try again.", 502);
  const { error: proposalError } = await supabase.rpc("submit_owner_website_media_proposal", { p_vendor_id: vendorId, p_media_kind: mediaKind, p_storage_path: storagePath, p_content_type: downloaded.type, p_byte_size: downloaded.bytes.byteLength, p_checksum_sha256: await sha256(downloaded.bytes), p_alt_text: altText, p_origin_url: originUrl, p_source_basis: sourceBasis });
  if (proposalError) { await admin.storage.from("owner-media-proposals").remove([storagePath]); return error(proposalError.message || "The proposal could not be recorded.", 400); }
  return NextResponse.json({ ok: true });
}

async function fetchImage(url: URL, recordedHost: string) {
  let current = url; for (let count = 0; count < 4; count += 1) { try { const response = await fetch(current, { redirect: "manual", signal: AbortSignal.timeout(12_000), headers: { "user-agent": "SuburbMates-owner-media-import/1.0" } }); if (response.status >= 300 && response.status < 400) { const location = response.headers.get("location"); if (!location) return null; const next = new URL(location, current); if (next.protocol !== "https:" || !sameHost(next.hostname, recordedHost)) return null; current = next; continue; } const contentType = response.headers.get("content-type")?.split(";", 1)[0].toLowerCase(); if (!response.ok || !contentType || !["image/jpeg", "image/png", "image/webp"].includes(contentType)) return null; const length = Number(response.headers.get("content-length") ?? 0); if (length > MAX_BYTES) return null; const bytes = new Uint8Array(await response.arrayBuffer()); return bytes.byteLength > 0 && bytes.byteLength <= MAX_BYTES ? { bytes, type: contentType as "image/jpeg" | "image/png" | "image/webp" } : null; } catch { return null; } } return null;
}
async function sha256(bytes: Uint8Array) { const digest = await crypto.subtle.digest("SHA-256", bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer); return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join(""); }
function error(message: string, status: number) { return NextResponse.json({ error: message }, { status }); }
