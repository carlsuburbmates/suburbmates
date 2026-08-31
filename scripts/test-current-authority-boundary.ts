import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const unified = readFileSync("docs/REFERENCE/SuburbMates — Unified Operations Specification.md", "utf8");
const decisionLog = readFileSync("docs/REFERENCE/SuburbMates — Decision Log.md", "utf8");

assert.match(unified, /## Historical-reference boundary/);
assert.match(unified, /must not be revived from this document/);
assert.match(unified, /Stripe checkout, subscriptions, invoices, payment-status operations, Premium presentation/);
assert.match(unified, /manual-only publication rule/);
assert.match(unified, /requires a new owner-approved benefit, price, lifecycle and reconciliation specification/);
assert.match(decisionLog, /D-018 — Modern directory automation, useful public profiles and value-first owner participation/);
assert.match(decisionLog, /Payment must never determine publication, ownership, legitimacy, factual trust signals or organic search ranking/);

console.log("Current authority boundary checks passed.");
