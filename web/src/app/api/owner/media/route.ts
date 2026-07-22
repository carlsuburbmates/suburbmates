import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

const MAX_BYTES = 2 * 1024 * 1024;
const kinds = new Set(["logo", "listing_image"]);

export async function POST(request: Request) {
  const form = await request.formData();
  const vendorId = String(form.get("vendorId") ?? "");
  const mediaKind = String(form.get("mediaKind") ?? "");
  const altText = String(form.get("altText") ?? "").trim();
  const sourceBasis = String(form.get("sourceBasis") ?? "").trim();
  const file = form.get("file");

  if (!isUuid(vendorId) || !kinds.has(mediaKind) || !(file instanceof File)) return error("Choose a business, media type and image.", 400);
  if (file.size < 1 || file.size > MAX_BYTES) return error("Choose an image smaller than 2 MB.", 400);
  if (altText.length < 2 || altText.length > 160 || sourceBasis.length < 10 || sourceBasis.length > 1000) return error("Describe the image and your permission to use it.", 400);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return error("Sign in to propose media.", 401);
  const { data: owned, error: ownedError } = await supabase.rpc("list_current_owner_vendors");
  if (ownedError || !(owned ?? []).some((vendor: { id: string }) => vendor.id === vendorId)) return error("Only the claimed owner can propose media for this listing.", 403);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const contentType = imageContentType(bytes);
  if (!contentType) return error("Choose a JPEG, PNG or WebP image.", 400);
  const extension = contentType === "image/jpeg" ? "jpg" : contentType === "image/png" ? "png" : "webp";
  const storagePath = `proposals/${vendorId}/${crypto.randomUUID()}.${extension}`;
  const checksum = await sha256(bytes);
  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage.from("owner-media-proposals").upload(storagePath, bytes, { contentType, upsert: false });
  if (uploadError) return error("The image could not be saved. Please try again.", 502);

  const { error: proposalError } = await supabase.rpc("submit_owner_media_proposal", {
    p_vendor_id: vendorId, p_media_kind: mediaKind, p_storage_path: storagePath, p_content_type: contentType,
    p_byte_size: bytes.byteLength, p_checksum_sha256: checksum, p_alt_text: altText, p_source_basis: sourceBasis,
  });
  if (proposalError) {
    await admin.storage.from("owner-media-proposals").remove([storagePath]);
    return error(proposalError.message || "The proposal could not be recorded.", 400);
  }
  return NextResponse.json({ ok: true });
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function imageContentType(bytes: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && String.fromCharCode(...bytes.slice(0, 8)) === "\x89PNG\r\n\x1a\n") return "image/png";
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  return null;
}

async function sha256(bytes: Uint8Array) {
  const payload = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const digest = await crypto.subtle.digest("SHA-256", payload);
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
}

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}
