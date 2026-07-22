"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#121212]" />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [showEmailCode, setShowEmailCode] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  const next = safeNext(searchParams.get("next"));

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.session) {
      setMessage({ kind: "error", text: "We could not sign you in with that email and password. Check both, or reset your password below." });
    } else {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      window.location.assign(next);
    }
    setLoading(false);
  };

  const handleSendCode = async () => {
    setLoading(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });

    if (error) {
      const text = error.message.toLowerCase().includes("rate")
        ? "Too many sign-in codes were requested. Wait a little while, then try again."
        : "We could not send a sign-in code. Check the email address and try again.";
      setMessage({ kind: "error", text });
    } else {
      setCodeSent(true);
      setMessage({ kind: "success", text: "Check your email for the eight-digit sign-in code. Enter it here; the email can be opened on another device." });
    }
    setLoading(false);
  };

  const handlePasswordReset = async () => {
    if (!email) {
      setMessage({ kind: "error", text: "Enter your email address first, then choose password reset." });
      return;
    }
    setLoading(true);
    setMessage(null);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) {
      setMessage({ kind: "error", text: "We could not send the password-reset email. Wait a little while if you recently requested an email, then try again." });
    } else {
      setMessage({ kind: "success", text: "Check your email for the password-reset link. You can open it on the device where you want to set your password." });
    }
    setLoading(false);
  };

  const handleCodeVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = code.replace(/\s/g, "");
    if (!/^\d{8}$/.test(token)) {
      setMessage({ kind: "error", text: "Enter the eight-digit code from your newest email." });
      return;
    }
    setLoading(true);
    setMessage(null);
    const supabase = createClient();
    const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
    if (error || !data.session) {
      setMessage({ kind: "error", text: "That code could not be used. Check you entered the newest code, or request another after the rate limit clears." });
    } else {
      // Let the browser persist the new session before the protected page is
      // rendered on the server.
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      window.location.assign(next);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#121212] text-white p-4">
      <div className="w-full max-w-md space-y-8 bg-white text-[#121212] p-8 rounded-lg shadow-xl">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight">Sign in to SuburbMates</h1>
          <p className="mt-2 text-sm text-gray-600">Sign in with your email and password. Existing authorised accounts only.</p>
        </div>
        {searchParams.get("error") === "magic-link" && (
          <p role="alert" className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm font-medium text-amber-900">
            That older sign-in link could not be completed. Request a new email code below and enter it in this browser. Do not request another code until the email rate limit has cleared.
          </p>
        )}
        <form className="mt-8 space-y-4" onSubmit={handlePasswordLogin}>
          <div>
            <label htmlFor="email" className="sr-only">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-[#121212] focus:outline-none focus:ring-[#121212] focus:border-[#121212] focus:z-10 sm:text-sm"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="password" className="sr-only">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={12}
              autoComplete="current-password"
              className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-[#121212] focus:outline-none focus:ring-[#121212] focus:border-[#121212] focus:z-10 sm:text-sm"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#121212] hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#121212] disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </div>
          {message && (
            <p
              role={message.kind === "error" ? "alert" : "status"}
              className={`rounded-md border p-3 text-center text-sm font-medium ${message.kind === "error" ? "border-red-300 bg-red-50 text-red-800" : "border-green-300 bg-green-50 text-green-800"}`}
            >
              {message.text}
            </p>
          )}
        </form>
        <div className="border-t border-gray-200 pt-5 text-center text-sm">
          <button type="button" disabled={loading} onClick={handlePasswordReset} className="font-medium text-[#121212] underline hover:text-gray-700 disabled:opacity-50">Set or reset password</button>
          <p className="mt-2 text-xs text-gray-500">Use a unique password of at least 12 characters.</p>
        </div>
        <div className="border-t border-gray-200 pt-5">
          <button type="button" disabled={loading} onClick={() => setShowEmailCode((visible) => !visible)} className="w-full text-sm font-medium text-[#121212] underline hover:text-gray-700 disabled:opacity-50">{showEmailCode ? "Hide email-code sign-in" : "Use a one-time email code instead"}</button>
        </div>
        {showEmailCode && (
          <div className="space-y-4">
            <button type="button" disabled={loading || !email} onClick={handleSendCode} className="group relative flex w-full justify-center rounded-md border border-[#121212] bg-white px-4 py-2 text-sm font-medium text-[#121212] hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#121212] focus:ring-offset-2 disabled:opacity-50">{loading ? "Sending code..." : codeSent ? "Send a new code" : "Send sign-in code"}</button>
            {!email && <p className="text-center text-xs text-gray-500">Enter your email address above before requesting a code.</p>}
          </div>
        )}
        {showEmailCode && codeSent && (
          <form className="space-y-4 border-t border-gray-200 pt-6" onSubmit={handleCodeVerification}>
            <div>
              <label htmlFor="code" className="text-sm font-medium text-gray-700">Sign-in code</label>
              <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{8}" maxLength={8} required className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 tracking-[0.35em] text-[#121212] focus:outline-none focus:ring-2 focus:ring-[#121212]" placeholder="12345678" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} />
            </div>
            <button type="submit" disabled={loading} className="group relative flex w-full justify-center rounded-md border border-transparent bg-[#121212] px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-[#121212] focus:ring-offset-2 disabled:opacity-50">{loading ? "Verifying code..." : "Verify and sign in"}</button>
          </form>
        )}
      </div>
    </div>
  );
}

function safeNext(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/ops";
}
