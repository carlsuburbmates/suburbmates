import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy | SuburbMates",
  description: "How SuburbMates collects, uses, protects and removes personal information.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-4xl px-6 py-16">
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Last updated 16 July 2026</p>
      <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Privacy</h1>
      <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
        This notice explains how SuburbMates handles personal information when you browse the directory, contact us, submit a business, claim a listing or manage an approved profile.
      </p>

      <div className="mt-12 space-y-10 text-slate-700">
        <Section title="Information we collect">
          <ul className="list-disc space-y-2 pl-6">
            <li>Public business facts such as a business name, location, category, website, phone number and business contact details.</li>
            <li>Your name, email address and evidence when you submit a business, request ownership or propose a listing change.</li>
            <li>Your name, reply email and message when you contact support.</li>
            <li>Authentication, consent, security and audit records needed to protect reviewed workflows and investigate misuse.</li>
          </ul>
          <p className="mt-4">Please do not send sensitive information that is not needed for your request. SuburbMates does not use advertising trackers and does not currently collect card details.</p>
        </Section>

        <Section title="How we collect and use it">
          <p>Information comes directly from you, from a business owner or representative, or from public business sources reviewed for the directory. We use it to operate the directory, review submissions and ownership requests, respond to support, prevent abuse, correct records and keep an accountable audit history.</p>
          <p className="mt-4">We do not sell personal information. A submitted listing or profile edit is private until reviewed. Approved business contact details may become public on the directory; support messages, claim evidence and operator notes stay private.</p>
        </Section>

        <Section title="Service providers and overseas processing">
          <p>SuburbMates uses Cloudflare for website delivery and human verification, Supabase for database and authentication services, and Resend and its delivery infrastructure for service email. They process information only to provide these services under their own security and privacy terms.</p>
          <p className="mt-4">Our primary database is hosted in Australia. These providers operate global infrastructure, so limited information may also be processed outside Australia, including in the United States and other countries where they or their infrastructure providers operate.</p>
        </Section>

        <Section title="Security and retention">
          <p>Private workflow data is protected by access controls, server-only write boundaries and audit records. No internet service can promise absolute security, so we collect only what the workflow needs.</p>
          <ul className="mt-4 list-disc space-y-2 pl-6">
            <li>Spam contact messages are automatically deleted after 30 days.</li>
            <li>Resolved contact messages are automatically deleted after 12 months.</li>
            <li>Unresolved support, claim and listing-review records are kept while the request, ownership, correction or dispute remains active.</li>
            <li>Public business facts and their non-personal provenance may remain while the listing is part of the directory.</li>
            <li>Minimal audit records may remain longer to preserve the integrity of material decisions; they do not retain deleted contact-message content.</li>
          </ul>
        </Section>

        <Section title="Access, correction and complaints">
          <p>You may ask what personal information SuburbMates holds about you, request a correction or deletion where appropriate, or raise a privacy complaint. Use the privacy option on the contact form. We may need to verify your identity before acting on a request.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/contact" className="btn btn-primary">Make a privacy request</Link>
            <a href="https://www.oaic.gov.au/privacy" className="btn btn-outline" rel="noreferrer">Australian privacy guidance</a>
          </div>
        </Section>

        <Section title="Changes to this notice">
          <p>We will update this page before materially changing how personal information is collected or used. The date at the top shows the current version.</p>
        </Section>
      </div>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h2 className="text-2xl font-black tracking-tight text-slate-950">{title}</h2><div className="mt-4 leading-7">{children}</div></section>;
}
