"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    kind: "error" | "success";
    text: string;
  } | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length < 12) {
      setMessage({
        kind: "error",
        text: "Use a password with at least 12 characters.",
      });
      return;
    }
    if (password !== confirmation) {
      setMessage({ kind: "error", text: "The two passwords do not match." });
      return;
    }
    setLoading(true);
    setMessage(null);
    const { error } = await createClient().auth.updateUser({ password });
    if (error) {
      setMessage({
        kind: "error",
        text: "This password-reset link could not be completed. Request a new reset email and open its newest link.",
      });
    } else {
      setMessage({
        kind: "success",
        text: "Your password is set. You can now sign in with it on any device.",
      });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#121212] p-4 text-white flex items-center justify-center">
      <section className="w-full max-w-md rounded-lg bg-white p-8 text-[#121212] shadow-xl">
        <h1 className="text-3xl font-extrabold tracking-tight">
          Set your password
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Choose a unique password with at least 12 characters.
        </p>
        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <input
            aria-label="New password"
            type="password"
            required
            minLength={12}
            autoComplete="new-password"
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-[#121212]"
            placeholder="New password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <input
            aria-label="Confirm new password"
            type="password"
            required
            minLength={12}
            autoComplete="new-password"
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-[#121212]"
            placeholder="Confirm new password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
          />
          <button
            type="submit"
            disabled={loading}
            className="flex w-full justify-center rounded-md bg-[#121212] px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? "Saving password..." : "Save password"}
          </button>
        </form>
        {message && (
          <p
            role={message.kind === "error" ? "alert" : "status"}
            className={`mt-4 rounded-md border p-3 text-center text-sm font-medium ${message.kind === "error" ? "border-red-300 bg-red-50 text-red-800" : "border-green-300 bg-green-50 text-green-800"}`}
          >
            {message.text}
          </p>
        )}
      </section>
    </div>
  );
}
