import { NextRequest, NextResponse } from "next/server";
import { previewOwnerAuthorisedWebsite } from "@/lib/owner-authorised-website-preview";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const vendorId = request.nextUrl.searchParams.get("vendorId")?.trim();
  if (!vendorId) return NextResponse.json({ error: "A business is required." }, { status: 400 });

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Sign in is required." }, { status: 401 });

  const { data: ownedVendors, error: ownershipError } = await supabase.rpc("list_current_owner_vendors_with_channels");
  if (ownershipError) return NextResponse.json({ error: "Your businesses could not be checked." }, { status: 500 });
  const vendor = ((ownedVendors ?? []) as Array<{ id: string; website: string | null }>)
    .find((item) => item.id === vendorId);
  if (!vendor) return NextResponse.json({ error: "This business is not available in your owner account." }, { status: 404 });
  if (!vendor.website) return NextResponse.json({ error: "Add and submit a website first, then return here after it is approved." }, { status: 400 });

  try {
    const preview = await previewOwnerAuthorisedWebsite(vendor.website);
    return NextResponse.json({ preview }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The website could not be previewed safely.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
