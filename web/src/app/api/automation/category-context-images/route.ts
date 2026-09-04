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
    const { data: categories, error } = await admin.from("categories").select("slug").order("slug").limit(25);
    if (error) throw new Error("Could not load category image targets.");
    let selected = 0;
    for (const category of categories ?? []) {
      const result = await findPexelsCategoryImage(category.slug);
      if (result.state !== "selected" || !result.image) continue;
      const image = result.image;
      const { error: writeError } = await admin.from("licensed_category_context_images").upsert({
        category_slug: category.slug, provider: image.provider, provider_photo_id: String(image.providerPhotoId), provider_url: image.providerUrl,
        photographer: image.photographer, photographer_url: image.photographerUrl, image_url: image.imageUrl, alt_text: image.alt,
        keyword: result.keyword, licence_snapshot: "Pexels API and licence verified 2026-09-05; public credit retained.", selection_version: "pexels-category-v1", selected_at: new Date().toISOString(), updated_at: new Date().toISOString(), active: true,
      }, { onConflict: "category_slug" });
      if (writeError) throw new Error("Could not retain licensed category context.");
      selected += 1;
    }
    return NextResponse.json({ state: "completed", selected });
  } catch (error) {
    console.error("Licensed category image refresh failed", error);
    return NextResponse.json({ error: "Licensed category image refresh did not complete" }, { status: 500 });
  }
}
