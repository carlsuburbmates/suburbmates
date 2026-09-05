import { NextRequest, NextResponse } from "next/server";
import { fetchOwnerWebsiteImage, parseOwnerWebsiteImageUrl } from "@/lib/owner-website-media";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const vendorId = request.nextUrl.searchParams.get("vendorId")?.trim() ?? "";
  const originUrl = request.nextUrl.searchParams.get("originUrl")?.trim() ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(vendorId) || !originUrl) return error("A business and image are required.", 400);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return error("Sign in to preview website media.", 401);
  const { data: owned, error: ownedError } = await supabase.rpc("list_current_owner_vendors_with_channels");
  const vendor = (owned ?? []).find((item: { id: string }) => item.id === vendorId) as { website?: string | null } | undefined;
  if (ownedError || !vendor?.website) return error("A claimed listing with a recorded website is required.", 403);
  let requested: URL;
  let recordedHost: string;
  try {
    ({ requested, recordedHost } = parseOwnerWebsiteImageUrl(originUrl, vendor.website));
  } catch {
    return error("Use an HTTPS image URL from the recorded business website.", 400);
  }
  const downloaded = await fetchOwnerWebsiteImage(requested, recordedHost);
  if (!downloaded) return error("The website image could not be previewed safely.", 422);
  return new NextResponse(downloaded.bytes, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Type": downloaded.type,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "private, no-store" } });
}
