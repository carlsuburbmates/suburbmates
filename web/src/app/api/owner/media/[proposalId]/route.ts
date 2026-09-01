import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// A proposal is never made public by this route. It only serves a private
// object after the signed-in owner has proved the proposal belongs to them.
export async function GET(_: Request, { params }: { params: Promise<{ proposalId: string }> }) {
  const { proposalId } = await params;
  if (!uuid.test(proposalId)) return notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return notFound();

  const { data: proposals, error } = await supabase.rpc("list_current_owner_media_proposals");
  if (error || !(proposals ?? []).some((proposal: { proposal_id: string }) => proposal.proposal_id === proposalId)) return notFound();

  const { data: proposal } = await createAdminClient()
    .from("listing_media_proposals")
    .select("storage_path, content_type")
    .eq("id", proposalId)
    .single();
  if (!proposal) return notFound();

  const { data: blob } = await createAdminClient().storage.from("owner-media-proposals").download(proposal.storage_path);
  if (!blob) return notFound();
  return new NextResponse(blob, {
    headers: {
      "Content-Type": proposal.content_type,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function notFound() {
  return new NextResponse(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
}
