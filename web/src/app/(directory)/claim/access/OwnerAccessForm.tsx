"use client";

import { useActionState, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { SubmitButton, TurnstileField } from "../../join/JoinFormControls";
import { requestOwnerAccessAction, type OwnerAccessState } from "./actions";

const initialState: OwnerAccessState = { status: "idle", email: "", message: "" };

export function OwnerAccessForm({ siteKey, claimPath }: { siteKey: string; claimPath: string }) {
  const [state, action] = useActionState(requestOwnerAccessAction, initialState);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    const token = code.replace(/\D/g, "");
    if (!/^\d{8}$/.test(token)) { setVerificationError("Enter the eight-digit code from your newest email."); return; }
    setVerifying(true); setVerificationError(null);
    const { data, error } = await createClient().auth.verifyOtp({ email: state.email, token, type: "email" });
    if (error || !data.session) { setVerificationError("That code could not be used. Check the newest email or request another code after the rate limit clears."); setVerifying(false); return; }
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    window.location.assign(claimPath);
  }

  if (state.status === "sent") return <div className="space-y-5"><p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">{state.message}</p><form onSubmit={verify} className="space-y-4"><label className="block text-sm font-bold">Eight-digit access code<input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{8}" maxLength={8} required className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 font-normal" placeholder="12345678" /></label>{verificationError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">{verificationError}</p>}<button type="submit" disabled={verifying} className="btn btn-primary min-h-11 w-full sm:w-auto">{verifying ? "Verifying…" : "Verify and continue to claim"}</button></form><p className="text-xs leading-5 text-slate-500">The account only confirms your email. Ownership still requires a reviewed claim.</p></div>;

  return <form action={action} className="space-y-5"><label className="block text-sm font-bold">Business email address<input name="email" type="email" required maxLength={254} autoComplete="email" className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 font-normal" placeholder="you@yourbusiness.com.au" /></label>{state.status === "error" && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">{state.message}</p>}<TurnstileField siteKey={siteKey} action="owner_access" /><SubmitButton pendingLabel="Sending secure code…">Send owner access code</SubmitButton><p className="text-xs leading-5 text-slate-500">Creating access does not claim a listing. After signing in, your email must match the listing or you can request private claim help.</p></form>;
}
