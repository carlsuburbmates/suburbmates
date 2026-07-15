"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    
    // Get the next parameter from the current URL if it exists
    const searchParams = new URLSearchParams(window.location.search);
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
      setMessage(error.message);
    } else {
      setMessage("Check your email for the magic link!");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#121212] text-white p-4">
      <div className="w-full max-w-md space-y-8 bg-white text-[#121212] p-8 rounded-lg shadow-xl">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold tracking-tight">Vendor Portal</h2>
          <p className="mt-2 text-sm text-gray-600">Sign in with your email</p>
        </div>
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
          {message && <p className="mt-2 text-center text-sm font-medium">{message}</p>}
        </form>
      </div>
    </div>
  );
}
