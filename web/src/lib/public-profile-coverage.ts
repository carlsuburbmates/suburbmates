import type { SupabaseClient } from "@supabase/supabase-js";

export type PublicProfileCoverage = {
  total: number;
  streetAddress: number;
  directContact: number;
  description: number;
  tradingHours: number;
  readAt: string;
};

type CountResult = { count: number | null; error: { message: string } | null };

function count(result: CountResult, label: string) {
  if (result.error) throw new Error(`Could not read ${label} coverage.`);
  return result.count ?? 0;
}

/**
 * Reads counts only from the existing public projection. This deliberately
 * avoids loading individual profiles or creating another operational queue.
 */
export async function getPublicProfileCoverage(supabase: SupabaseClient): Promise<PublicProfileCoverage> {
  const [total, streetAddress, directContact, description, tradingHours] = await Promise.all([
    supabase.from("published_vendors").select("id", { count: "exact", head: true }),
    supabase.from("published_vendors").select("id", { count: "exact", head: true }).not("street_address", "is", null),
    supabase.from("published_vendors").select("id", { count: "exact", head: true }).or("phone.not.is.null,contact_email.not.is.null,website.not.is.null"),
    supabase.from("published_vendors").select("id", { count: "exact", head: true }).not("description", "is", null),
    supabase.from("published_vendors").select("id", { count: "exact", head: true }).not("trading_hours", "is", null),
  ]);

  return {
    total: count(total, "published profile"),
    streetAddress: count(streetAddress, "street-address"),
    directContact: count(directContact, "direct-contact"),
    description: count(description, "description"),
    tradingHours: count(tradingHours, "trading-hours"),
    readAt: new Date().toISOString(),
  };
}
