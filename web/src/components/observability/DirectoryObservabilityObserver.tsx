"use client";

import { useEffect } from "react";
import type { DirectoryObservabilityEvent } from "@/lib/directory-observability";

function send(event: DirectoryObservabilityEvent) {
  const body = JSON.stringify({ event });
  void fetch("/api/directory-observability", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
    credentials: "same-origin",
  }).catch(() => {
    // Aggregate observation must never affect a public journey.
  });
}

export function recordDirectoryObservabilityEvent(event: DirectoryObservabilityEvent) {
  send(event);
}

export function DirectoryObservabilityObserver() {
  useEffect(() => {
    recordEntry();

    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!target || !isPublicDirectoryPath(location.pathname)) return;
      const eventName = target.dataset.directoryAction === "booking"
        ? "outbound_booking"
        : target.dataset.directoryAction === "menu"
          ? "outbound_menu"
          : outboundEvent(target.href);
      if (eventName) send(eventName);
    };
    const onSubmit = (event: Event) => {
      const form = event.target instanceof HTMLFormElement ? event.target : null;
      const query = form?.querySelector<HTMLInputElement>('input[name="q"], #directory-search')?.value.trim();
      if (form && query && new URL(form.action || location.href, location.href).pathname === "/businesses") send("directory_search");
    };

    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
    };
  }, []);

  return null;
}

export function DirectoryProfileView({ rich = false, websiteEnriched = false }: { rich?: boolean; websiteEnriched?: boolean }) {
  useEffect(() => {
    send("business_profile_view");
    send(rich ? "profile_cohort_rich_view" : "profile_cohort_baseline_view");
    send(websiteEnriched ? "profile_cohort_website_enriched_view" : "profile_cohort_website_unchanged_view");
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!target) return;
      const action = target.dataset.directoryAction === "booking" || target.dataset.directoryAction === "menu" || outboundEvent(target.href);
      if (action) {
        send(rich ? "profile_cohort_rich_contact" : "profile_cohort_baseline_contact");
        send(websiteEnriched ? "profile_cohort_website_enriched_contact" : "profile_cohort_website_unchanged_contact");
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [rich, websiteEnriched]);
  return null;
}

function recordEntry() {
  if (!isPublicDirectoryPath(location.pathname) || isInternalReferrer(document.referrer)) return;
  send(entryEvent(location.pathname));
}

function isInternalReferrer(referrer: string) {
  try {
    return Boolean(referrer) && new URL(referrer).origin === location.origin;
  } catch {
    return false;
  }
}

function entryEvent(pathname: string): DirectoryObservabilityEvent {
  if (pathname === "/") return "entry_home";
  if (pathname.startsWith("/vendor/")) return "entry_profile";
  if (pathname === "/contact") return "entry_contact";
  if (
    pathname === "/businesses" ||
    pathname.startsWith("/categories") ||
    pathname.startsWith("/locations") ||
    pathname.split("/").filter(Boolean).length <= 2
  ) return "entry_directory";
  return "entry_owner";
}

const privateRouteRoots = new Set([
  "api",
  "auth",
  "claim",
  "dashboard",
  "login",
  "ops",
  "reset-password",
]);

function isPublicDirectoryPath(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const [root] = segments;
  if (
    !root ||
    privateRouteRoots.has(root) ||
    root.startsWith("_") ||
    root === "cdn-cgi" ||
    root === "browse"
  ) return pathname === "/";

  if (
    pathname === "/businesses" ||
    pathname === "/contact" ||
    pathname === "/join" ||
    pathname === "/how-it-works" ||
    pathname === "/privacy"
  ) return true;

  if (root === "categories" || root === "locations" || root === "vendor") return segments.length === 2;

  // The remaining one- and two-segment routes are published locality and
  // locality/category pages. Private route roots are explicitly excluded above.
  return segments.length <= 2;
}

function outboundEvent(href: string): DirectoryObservabilityEvent | null {
  if (href.startsWith("tel:")) return "outbound_phone";
  if (href.startsWith("mailto:")) return "outbound_email";
  try {
    const url = new URL(href, location.href);
    if (url.hostname === "www.google.com" && url.pathname.startsWith("/maps")) return "outbound_directions";
    if (url.origin !== location.origin && /^https?:$/.test(url.protocol)) return "outbound_website";
  } catch {
    return null;
  }
  return null;
}
