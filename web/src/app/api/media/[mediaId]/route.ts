import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function GET(_: Request, { params }: { params: Promise<{ mediaId: string }> }) {
  if (process.env.NEXT_PUBLIC_PUBLIC_LAUNCH_ENABLED !== "true") return new NextResponse(null, { status: 404 });
  const { mediaId } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(mediaId)) return new NextResponse(null, { status: 404 });
  const supabase = await createClient();
  const { data } = await supabase.rpc("resolve_public_media", { p_media_id: mediaId });
  const media = data?.[0] as { storage_path: string; content_type: string } | undefined;
  if (!media) return new NextResponse(null, { status: 404 });
  const { data: blob } = await createAdminClient().storage.from("owner-media-proposals").download(media.storage_path);
  if (!blob) return new NextResponse(null, { status: 404 });
  return new NextResponse(blob, { headers: { "Content-Type": media.content_type, "Cache-Control": "public, max-age=3600", "X-Content-Type-Options": "nosniff" } });
}
