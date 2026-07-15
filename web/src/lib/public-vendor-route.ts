import type { SupabaseClient } from "@supabase/supabase-js";

export type PublicVendorRoute = {
  vendorId: string;
  currentSlug: string;
  redirectRequired: boolean;
};

export async function resolvePublicVendorRoute(
  client: SupabaseClient,
  routeKey: string,
): Promise<PublicVendorRoute | null> {
  const { data, error } = await client.rpc("resolve_public_vendor_route", {
    p_route_key: routeKey,
  });
  if (error) throw new Error(`Public vendor route resolution failed: ${error.code ?? "unknown"}`);

  const row = Array.isArray(data) ? data[0] : null;
  if (!row) return null;
  return {
    vendorId: row.vendor_id,
    currentSlug: row.current_slug,
    redirectRequired: row.redirect_required,
  };
}
