import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import ClaimClient from "./ClaimClient";

export const metadata = {
  title: "Claim Your Business | SuburbMates",
};

export default async function ClaimPage() {
  const supabase = await createClient();
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session) {
    redirect("/login?next=/claim");
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-black tracking-tight mb-2">Claim Your Business</h1>
          <p className="text-slate-600">
            Sign in using the business contact email. Matching listings can be claimed instantly.
          </p>
        </div>
        
        <ClaimClient />
      </div>
    </div>
  );
}
