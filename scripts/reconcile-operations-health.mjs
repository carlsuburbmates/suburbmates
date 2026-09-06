const repository = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
const apiBase = process.env.GITHUB_API_URL ?? "https://api.github.com";
const issueTitle = "[Operations health] Scheduled workflows need attention";

if (!repository || !token) throw new Error("GitHub repository context is unavailable.");

const monitored = [
  { name: "Catalogue candidate discovery", maximumAgeHours: 240, impact: "Weekly OpenStreetMap discovery is not current." },
  { name: "ASIC Credit Licensee catalogue discovery", maximumAgeHours: 240, impact: "Weekly ASIC credit-licensee discovery is not current." },
  { name: "Tax Practitioners Board catalogue discovery", maximumAgeHours: 960, impact: "Monthly tax-practitioner discovery is not current." },
  { name: "Victorian liquor-licence catalogue discovery", maximumAgeHours: 960, impact: "Monthly liquor-licence discovery is not current." },
  { name: "HubSpot Decision Inbox", maximumAgeHours: 3, impact: "The optional decision-inbox mirror is not current; use protected /ops directly." },
  { name: "Licensed category-context images", maximumAgeHours: 48, impact: "Category-image coverage is not being refreshed; existing credited images remain unchanged." },
  { name: "Official website factual enrichment", maximumAgeHours: 48, impact: "Official-website facts are not being refreshed; existing public fields remain unchanged." },
  { name: "Production smoke", maximumAgeHours: 48, impact: "The latest automated public-site safety check is not current." },
  { name: "Website safety evidence", maximumAgeHours: 240, impact: "The weekly outbound-link safety evidence is not current." },
];

async function github(path, init = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "x-github-api-version": "2022-11-28",
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) throw new Error(`GitHub API request failed (${response.status}).`);
  return response.status === 204 ? null : response.json();
}

const workflowResponse = await github(`/repos/${repository}/actions/workflows?per_page=100`);
const workflows = new Map(workflowResponse.workflows.map((workflow) => [workflow.name, workflow]));
const now = Date.now();
const problems = [];

for (const expected of monitored) {
  const workflow = workflows.get(expected.name);
  if (!workflow) {
    problems.push({ ...expected, state: "missing", detail: "The workflow definition could not be found.", url: `https://github.com/${repository}/actions` });
    continue;
  }
  // A successful owner-triggered recovery is current operational evidence too;
  // cadence-based staleness still proves that recurring execution continues.
  const runResponse = await github(`/repos/${repository}/actions/workflows/${workflow.id}/runs?status=completed&per_page=1`);
  const run = runResponse.workflow_runs[0];
  if (!run) {
    problems.push({ ...expected, state: "missing", detail: "No completed run was found.", url: workflow.html_url });
    continue;
  }
  const ageHours = (now - new Date(run.updated_at).getTime()) / 3_600_000;
  if (run.conclusion !== "success") {
    problems.push({ ...expected, state: run.conclusion ?? "failed", detail: `The latest scheduled run concluded as ${run.conclusion ?? "failed"}.`, url: run.html_url });
  } else if (ageHours > expected.maximumAgeHours) {
    problems.push({ ...expected, state: "stale", detail: `The last successful scheduled run is ${Math.floor(ageHours)} hours old.`, url: run.html_url });
  }
}

// Reuse one durable operator record across failure/recovery cycles so /ops can
// link to a stable place instead of accumulating or chasing issue numbers.
const search = await github(`/repos/${repository}/issues?state=all&per_page=100`);
const existing = search.find((issue) => issue.title === issueTitle && !issue.pull_request);

if (problems.length === 0) {
  if (existing) {
    await github(`/repos/${repository}/issues/${existing.number}/comments`, { method: "POST", body: JSON.stringify({ body: "All monitored scheduled workflows have recovered. This issue is closing automatically." }) });
    await github(`/repos/${repository}/issues/${existing.number}`, { method: "PATCH", body: JSON.stringify({ state: "closed", state_reason: "completed" }) });
  }
  console.log("All monitored scheduled workflows are healthy.");
  process.exit(0);
}

const rows = problems.map((problem) => `| ${problem.name} | ${problem.state} | ${problem.impact} | [Open run or workflow](${problem.url}) |`).join("\n");
const body = [
  "SuburbMates detected scheduled work that needs attention. Public and owner data were not changed by this monitor.",
  "",
  "| Workflow | State | What this means | Safe next step |",
  "| --- | --- | --- | --- |",
  rows,
  "",
  "Open the linked run and use **Re-run failed jobs** once. If it fails again, leave the workflow paused and use `/ops/System`; do not edit public business records to compensate.",
  "",
  `Last reconciled: ${new Date(now).toISOString()}`,
].join("\n");

if (existing) {
  await github(`/repos/${repository}/issues/${existing.number}`, { method: "PATCH", body: JSON.stringify({ body, state: "open" }) });
  console.log(`Updated and opened operations health issue #${existing.number}.`);
} else {
  const created = await github(`/repos/${repository}/issues`, { method: "POST", body: JSON.stringify({ title: issueTitle, body }) });
  console.log(`Created operations health issue #${created.number}.`);
}
