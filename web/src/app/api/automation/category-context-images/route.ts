import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { findPexelsCategoryImage } from "@/lib/pexels-category-images";
import { runtimeEnv } from "@/lib/runtime-env";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!runtimeEnv("AUTOMATION_INGEST_TOKEN") || token !== runtimeEnv("AUTOMATION_INGEST_TOKEN")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!runtimeEnv("PEXELS_API_KEY")) return NextResponse.json({ state: "held", reason: "Pexels provider key is not configured." });

  try {
    const admin = createAdminClient();
    const { count: categoryCount, error: countError } = await admin.from("categories").select("slug", { count: "exact", head: true });
    if (countError || !categoryCount) throw new Error("Could not count category image targets.");
    const weeklyBatch = 25;
    const week = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
    const offset = (week * weeklyBatch) % categoryCount;
    const { data: categories, error } = await admin.from("categories").select("slug").order("slug").range(offset, Math.min(offset + weeklyBatch - 1, categoryCount - 1));
    if (error) throw new Error("Could not load category image targets.");
    const { data: existing, error: existingError } = await admin.from("licensed_category_context_images").select("provider_photo_id");
    if (existingError) throw new Error("Could not read existing licensed category context.");
    const usedPhotoIds = new Set((existing ?? []).map((image: { provider_photo_id: string }) => Number(image.provider_photo_id)).filter(Number.isInteger));
    let selected = 0;
    for (const category of categories ?? []) {
      const result = await findPexelsCategoryImage(category.slug, [], usedPhotoIds);
      if (result.state !== "selected" || !result.image) continue;
      const image = result.image;
      const { error: writeError } = await admin.from("licensed_category_context_images").upsert({
        category_slug: category.slug, provider: image.provider, provider_photo_id: String(image.providerPhotoId), provider_url: image.providerUrl,
        photographer: image.photographer, photographer_url: image.photographerUrl, image_url: image.imageUrl, alt_text: image.alt,
        keyword: result.keyword, licence_snapshot: "Pexels API and licence verified 2026-09-05; public credit retained.", selection_version: "pexels-category-v1", selected_at: new Date().toISOString(), updated_at: new Date().toISOString(), active: true,
      }, { onConflict: "category_slug" });
      if (writeError) throw new Error("Could not retain licensed category context.");
      usedPhotoIds.add(image.providerPhotoId);
      selected += 1;
    }
    return NextResponse.json({ state: "completed", selected });
  } catch (error) {
    console.error("Licensed category image refresh failed", error);
    return NextResponse.json({ error: "Licensed category image refresh did not complete" }, { status: 500 });
  }
}
