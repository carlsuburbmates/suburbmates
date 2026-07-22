import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import ClaimClient from "./ClaimClient";

export const metadata = {
  title: "Claim Your Business | SuburbMates",
};

export default async function ClaimPage({ searchParams }: { searchParams: Promise<{ listing?: string }> }) {
  const { listing } = await searchParams;
  const selectedListingId = typeof listing === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(listing) ? listing : null;
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect(`/login?next=${encodeURIComponent(selectedListingId ? `/claim?listing=${selectedListingId}` : "/claim")}`);
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-black tracking-tight mb-2">Claim Your Business</h1>
          <p className="text-slate-600">
            Sign in using the business contact email. An email match supports your request, but ownership is granted only after review.
          </p>
        </div>
        
        <ClaimClient selectedListingId={selectedListingId} />
      </div>
    </div>
  );
}
