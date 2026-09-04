import assert from "node:assert/strict";
import fs from "node:fs";

const config = fs.readFileSync("web/wrangler.jsonc", "utf8");
const events = fs.readFileSync("web/src/lib/directory-observability.ts", "utf8");
const observer = fs.readFileSync("web/src/components/observability/DirectoryObservabilityObserver.tsx", "utf8");
const route = fs.readFileSync("web/src/app/api/directory-observability/route.ts", "utf8");
const summary = fs.readFileSync("web/src/lib/directory-observability-summary.ts", "utf8");
const system = fs.readFileSync("web/src/app/ops/system/page.tsx", "utf8");

assert.match(config, /"binding": "DIRECTORY_OBSERVABILITY"/);
assert.match(config, /"dataset": "suburbmates_directory_observability"/);
assert.match(events, /directoryObservabilityEvents/);
assert.match(events, /search text, URL, listing identifier, form content, account identifier, IP,/);
assert.match(observer, /fetch\("\/api\/directory-observability"/);
assert.match(observer, /keepalive: true/);
assert.match(observer, /credentials: "same-origin"/);
assert.doesNotMatch(observer, /navigator\.sendBeacon/);
assert.match(observer, /input\[name="q"\], #directory-search/);
assert.match(observer, /outbound_directions/);
assert.match(observer, /outbound_booking/);
assert.match(observer, /directoryAction/);
assert.match(observer, /const privateRouteRoots/);
for (const privateRoute of ["api", "auth", "claim", "dashboard", "login", "ops", "reset-password"]) {
  assert.match(observer, new RegExp(`"${privateRoute}"`));
}
assert.match(route, /isDirectoryObservabilityEvent/);
assert.match(route, /body\.length > 96/);
assert.match(route, /request\.headers\.get\("origin"\)/);
assert.match(summary, /SUM\(_sample_interval\) AS count/);
assert.match(summary, /rumPageloadEventsAdaptiveGroups/);
assert.match(system, /Directory activity \(last 7 days\)/);
assert.match(system, /It creates no work or alerts/);
assert.match(system, /not a person-level funnel/);
assert.match(system, /Rich-profile pilot comparison/);
assert.match(system, /profile_cohort_rich_view/);

for (const source of [events, observer, route, summary]) {
  assert.doesNotMatch(source, /document\.cookie|localStorage|sessionStorage|clientIP|searchParams/);
}

console.log("Directory observability privacy and System-only boundary checks passed.");
