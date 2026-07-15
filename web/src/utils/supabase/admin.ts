import "server-only";

import { createClient } from "@supabase/supabase-js";
import { runtimeEnv } from "@/lib/runtime-env";

export function createAdminClient() {
  const url = runtimeEnv("SUPABASE_URL") ?? runtimeEnv("NEXT_PUBLIC_SUPABASE_URL");
  const secret = runtimeEnv("SUPABASE_SECRET_KEY") ?? runtimeEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !secret) {
    throw new Error("Server-side Supabase credentials are not configured.");
  }

  return createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
