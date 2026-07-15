import "server-only";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { runtimeEnv } from "@/lib/runtime-env";

type TurnstileResult = {
  success?: boolean;
  hostname?: string;
  action?: string;
  "error-codes"?: string[];
};

export class TurnstileVerificationError extends Error {
  constructor(public readonly code: "verification" | "verification_unavailable") {
    super(code);
    this.name = "TurnstileVerificationError";
  }
}

export async function verifyTurnstileToken(token: string, expectedAction: string) {
  const secret = runtimeEnv("TURNSTILE_SECRET_KEY");
  if (!secret || !token || !/^[a-z0-9_-]{1,32}$/i.test(expectedAction)) {
    throw new TurnstileVerificationError("verification");
  }

  const requestHeaders = await headers();
  const body = new URLSearchParams({
    secret,
    response: token,
    idempotency_key: randomUUID(),
  });
  const remoteIp = requestHeaders.get("cf-connecting-ip");
  if (remoteIp) body.set("remoteip", remoteIp);

  let result: TurnstileResult;
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    result = (await response.json()) as TurnstileResult;
  } catch {
    throw new TurnstileVerificationError("verification_unavailable");
  }

  const testMode =
    runtimeEnv("TURNSTILE_TEST_MODE") === "true" &&
    secret === "1x0000000000000000000000000000000AA";
  const allowedHostnames = new Set(
    (runtimeEnv("CONTACT_ALLOWED_HOSTNAMES") ?? "suburbmates.com.au")
      .split(",")
      .map((hostname) => hostname.trim().toLowerCase())
      .filter(Boolean),
  );

  if (
    result.success !== true ||
    (!testMode && (
      result.action !== expectedAction || !result.hostname ||
      !allowedHostnames.has(result.hostname.toLowerCase())
    ))
  ) {
    throw new TurnstileVerificationError("verification");
  }

  return {
    hostname: testMode ? "cloudflare-official-test" : result.hostname!,
    action: testMode ? expectedAction : result.action!,
  };
}
