import "server-only";

import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

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
