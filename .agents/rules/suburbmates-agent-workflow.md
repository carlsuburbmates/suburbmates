# SuburbMates Agent Workflow

## Operating Mode

Work on one bounded outcome at a time. Before editing, state the intended
artifact, allowed files, and validation command. Stop after reporting the
result; do not begin a follow-on task unless asked.

## Approval Boundaries

Never seed vendors, publish vendors, change a hosted database, deploy, alter
DNS, or use payment tooling unless the user explicitly requests that action in
the active task.

Do not modify `data/vendor-candidates.csv` during address research. Research
tasks may create only the named report file. Do not create scraper scripts for
research tasks unless explicitly requested.

## Browser Research

Use at most three supplied official URLs per task. Record the exact URL and
the factual evidence found. Do not infer an address from a service area or
suburb name. If a page cannot be read, report that result and stop the batch.

## Deliverables

Use artifacts for plans, reports, diffs, and test evidence. A completed task
must name the changed files and show the exact validation outcome. Treat an
artifact as a proposal until it has been independently reviewed.
