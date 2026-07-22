import "server-only";

import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

// OpsLayout makes the access decision for every rendered /ops route. Child
// pages use this for data queries so a just-established browser session is not
// checked twice during the same initial render.
export async function createOpsDataClient() {
  return createClient();
}

export async function verifyOpsAdmin(nextPath: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  const { data: isOperator, error: operatorError } = await supabase.rpc(
    "is_current_user_operator",
  );

  if (operatorError || isOperator !== true) {
    notFound();
  }

  return { supabase, user };
}
