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
    const batchSize = 25;
    const { data: categories, error } = await admin.from("categories").select("slug").order("slug");
    if (error) throw new Error("Could not load category image targets.");
    const { data: existing, error: existingError } = await admin.from("licensed_category_context_images").select("category_slug, provider_photo_id, selected_at, active");
    if (existingError) throw new Error("Could not read existing licensed category context.");
    const usedPhotoIds = new Set((existing ?? []).map((image: { provider_photo_id: string }) => Number(image.provider_photo_id)).filter(Number.isInteger));
    const refreshBefore = Date.now() - (90 * 24 * 60 * 60 * 1000);
    const freshCategorySlugs = new Set((existing ?? [])
      .filter((image: { active: boolean; selected_at: string }) => image.active && Date.parse(image.selected_at) >= refreshBefore)
      .map((image: { category_slug: string }) => image.category_slug));
    const dueCategories = (categories ?? []).filter((category) => !freshCategorySlugs.has(category.slug));
    const targets = dueCategories.slice(0, batchSize);
    let selected = 0;
    const skippedFresh = freshCategorySlugs.size;
    const deferred = Math.max(0, dueCategories.length - targets.length);
    const failures: Array<{ category: string; stage: "provider" | "write"; code?: string }> = [];
    for (const category of targets) {
      let result;
      try {
        result = await findPexelsCategoryImage(category.slug, [], usedPhotoIds);
      } catch (error) {
        console.error("Licensed category image provider request failed", { category: category.slug, error });
        failures.push({ category: category.slug, stage: "provider" });
        continue;
      }
      if (result.state !== "selected" || !result.image) continue;
      const image = result.image;
      const { error: writeError } = await admin.from("licensed_category_context_images").upsert({
        category_slug: category.slug, provider: image.provider, provider_photo_id: String(image.providerPhotoId), provider_url: image.providerUrl,
        photographer: image.photographer, photographer_url: image.photographerUrl, image_url: image.imageUrl, alt_text: image.alt,
        keyword: result.keyword, licence_snapshot: "Pexels API and licence verified 2026-09-05; public credit retained.", selection_version: "pexels-category-v1", selected_at: new Date().toISOString(), updated_at: new Date().toISOString(), active: true,
      }, { onConflict: "category_slug" });
      if (writeError) {
        console.error("Licensed category image write failed", { category: category.slug, code: writeError.code, message: writeError.message });
        failures.push({ category: category.slug, stage: "write", code: writeError.code });
        continue;
      }
      usedPhotoIds.add(image.providerPhotoId);
      selected += 1;
    }
    if (targets.length > 0 && failures.length === targets.length) {
      return NextResponse.json({ state: "failed", selected, skippedFresh, deferred, failures }, { status: 503 });
    }
    return NextResponse.json({ state: failures.length > 0 ? "partial" : "completed", selected, skippedFresh, deferred, failures });
  } catch (error) {
    console.error("Licensed category image refresh failed", error);
    return NextResponse.json({ error: "Licensed category image refresh did not complete" }, { status: 500 });
  }
}
