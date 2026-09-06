"use server";

import { createClient } from "@/utils/supabase/server";
import { TurnstileVerificationError, verifyTurnstileToken } from "@/lib/turnstile";

export type OwnerAccessState = { status: "idle" | "sent" | "error"; email: string; message: string };

export async function requestOwnerAccessAction(_: OwnerAccessState, formData: FormData): Promise<OwnerAccessState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const token = String(formData.get("cf-turnstile-response") ?? "");
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: "error", email, message: "Enter a valid business email address." };
  }
  try {
    await verifyTurnstileToken(token, "owner_access");
  } catch (error) {
    return { status: "error", email, message: error instanceof TurnstileVerificationError && error.code === "verification_unavailable" ? "Human verification is temporarily unavailable. Try again shortly." : "Complete human verification and try again." };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  if (error) {
    return { status: "error", email, message: error.message.toLowerCase().includes("rate") ? "Too many email codes were requested. Wait a little while and try again." : "We could not send the access code. Check the email and try again." };
  }
  return { status: "sent", email, message: "Check your email for the eight-digit access code." };
}
