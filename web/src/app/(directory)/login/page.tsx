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
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    
    const next = searchParams.get("next");
    const redirectTo = new URL(`${window.location.origin}/auth/callback`);
    if (next) redirectTo.searchParams.set("next", next);
    
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo.toString(),
      },
    });

    if (error) {
      const text = error.message.toLowerCase().includes("rate")
        ? "Too many sign-in links were requested. Wait a little while, then try again."
        : "We could not send a sign-in link. Check the email address and try again.";
      setMessage({ kind: "error", text });
    } else {
      setMessage({ kind: "success", text: "Check your email for the sign-in link. Open the newest link in this same browser." });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#121212] text-white p-4">
      <div className="w-full max-w-md space-y-8 bg-white text-[#121212] p-8 rounded-lg shadow-xl">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight">Sign in to SuburbMates</h1>
          <p className="mt-2 text-sm text-gray-600">Enter your email to receive a one-time sign-in link for your authorised area.</p>
        </div>
        {searchParams.get("error") === "magic-link" && (
          <p role="alert" className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm font-medium text-amber-900">
            This sign-in link could not be completed. Open the newest link in the same browser that requested it. Do not request another link until the email rate limit has cleared.
          </p>
        )}
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
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
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#121212] hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#121212] disabled:opacity-50"
            >
              {loading ? "Sending magic link..." : "Send Magic Link"}
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
      </div>
    </div>
  );
}
