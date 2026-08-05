"use client";

import Script from "next/script";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

type Option = { name: string; slug: string };

type TurnstileApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window { turnstile?: TurnstileApi; }
}

export function CategoryField({ options, initialSlug = "" }: { options: Option[]; initialSlug?: string }) {
  const initialOption = options.find((option) => option.slug === initialSlug) ?? null;
  const [query, setQuery] = useState(initialOption?.name ?? "");
  const [selected, setSelected] = useState<Option | null>(initialOption);
  const [open, setOpen] = useState(false);
  const listId = useId();
  const matches = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    if (!term) return options.slice(0, 8);
    return options.filter((option) => option.name.toLocaleLowerCase().includes(term)).slice(0, 8);
  }, [options, query]);

  function choose(option: Option) {
    setSelected(option);
    setQuery(option.name);
    setOpen(false);
  }

  return <div className="relative min-w-0 text-sm font-bold">
    <label htmlFor={listId}>Category</label>
    <input type="hidden" name="categorySlug" value={selected?.slug ?? ""} />
    <input
      id={listId}
      type="search"
      value={query}
      autoComplete="off"
      placeholder="Start typing a category"
      role="combobox"
      aria-autocomplete="list"
      aria-controls={`${listId}-options`}
      aria-expanded={open}
      aria-invalid={query.length > 0 && !selected}
      onChange={(event) => { setQuery(event.target.value); setSelected(null); setOpen(true); }}
      onFocus={() => setOpen(true)}
      className="mt-2 w-full min-w-0 rounded-xl border border-slate-300 p-3 font-normal"
    />
    <p className="mt-2 text-xs font-normal leading-5 text-slate-600">Type to find and choose a category.</p>
    {open && <ul id={`${listId}-options`} role="listbox" className="absolute z-10 mt-2 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
      {matches.length > 0 ? matches.map((option) => <li key={option.slug} role="option" aria-selected={selected?.slug === option.slug}>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => choose(option)} className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600">{option.name}</button>
      </li>) : <li className="px-3 py-2 text-sm font-normal text-slate-600">No matching category. Try another term.</li>}
    </ul>}
  </div>;
}

export function SubmitButton({ children, pendingLabel }: { children: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [verificationReady, setVerificationReady] = useState(false);

  useEffect(() => {
    const form = buttonRef.current?.form;
    if (!form) return;
    const refresh = (event?: Event) => setVerificationReady(event instanceof CustomEvent ? Boolean(event.detail) : Boolean((form.elements.namedItem("cf-turnstile-response") as HTMLInputElement | null)?.value));
    refresh();
    form.addEventListener("turnstile-verification-change", refresh);
    return () => form.removeEventListener("turnstile-verification-change", refresh);
  }, []);

  const disabled = pending || !verificationReady;
  return <button ref={buttonRef} disabled={disabled} className="btn btn-primary w-full whitespace-normal sm:w-auto" aria-describedby="submission-progress">{pending ? pendingLabel : children}<span id="submission-progress" className="sr-only" aria-live="polite">{pending ? " Submission in progress." : verificationReady ? "" : " Complete human verification before submitting."}</span></button>;
}

export function TurnstileField({ siteKey, action = "business_submission" }: { siteKey: string; action?: "business_submission" | "contact" }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("Confirming you are human…");

  function notifyVerificationChange(ready = false) {
    containerRef.current?.closest("form")?.dispatchEvent(new CustomEvent("turnstile-verification-change", { detail: ready }));
  }

  function unavailable() {
    setToken("");
    setMessage("Human verification could not load. Check your connection and refresh it.");
    notifyVerificationChange();
  }

  function resetOrRender() {
    setToken("");
    notifyVerificationChange();
    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
      setMessage("Confirming you are human…");
      return;
    }
    render();
  }

  function render() {
    if (!containerRef.current || !window.turnstile) {
      unavailable();
      return;
    }
    if (widgetIdRef.current) window.turnstile.remove(widgetIdRef.current);
    containerRef.current.replaceChildren();
    try {
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        action,
        theme: "light",
        size: "flexible",
        callback: (nextToken: string) => { setToken(nextToken); setMessage("Human verification ready."); notifyVerificationChange(true); },
        "expired-callback": () => { setToken(""); setMessage("Human verification expired. Refresh it before submitting."); notifyVerificationChange(); },
        "error-callback": unavailable,
      });
    } catch {
      unavailable();
    }
  }

  useEffect(() => {
    if (window.turnstile) render();
    const timeout = window.setTimeout(() => { if (!window.turnstile) unavailable(); }, 8000);
    return () => { window.clearTimeout(timeout); if (widgetIdRef.current && window.turnstile) window.turnstile.remove(widgetIdRef.current); };
  // Turnstile is an external imperative widget; mount once and remove once.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <div className="min-w-0 sm:col-span-2">
    <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onLoad={render} onError={unavailable} />
    <input type="hidden" name="cf-turnstile-response" value={token} />
    <div ref={containerRef} className="min-h-[65px] min-w-0" aria-live="polite" />
    <p className="mt-2 text-xs leading-5 text-slate-600">{message} {!token && <button type="button" onClick={resetOrRender} className="font-bold underline underline-offset-2">Refresh verification</button>}</p>
  </div>;
}
