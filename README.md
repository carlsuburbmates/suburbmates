# SuburbMates

SuburbMates is a public, hyper-local business directory for the City of Darebin. Published listings can remain useful when some contact information is unavailable. New discoveries, ownership claims, and owner changes enter reviewed workflows before they affect public state.

Read [`docs/HANDOVER.md`](docs/HANDOVER.md) before changing the project. It is the canonical project context, current-state record, operating guide, and next-work queue.

Automation workflows, triggers, integrations, and safety boundaries are mapped in [`docs/AUTOMATION/`](docs/AUTOMATION/).

## Core commands

```bash
npm install
npm run check
npm run audit -- data/vendor-candidates-merged.csv
npm run seed -- --dry-run data/vendor-candidates-merged.csv
npm run catalogue:report -- data/vendor-candidates-merged.csv
```

The repository root contains catalogue acquisition, audit, and import tooling. The only web runtime and deployment configuration lives in `web/`; `npm run dev` at the root safely delegates there. Run web delivery checks from that directory:

```bash
npm install
npm run lint
npm run build
npm run cf:build
```

Cloudflare delivers the production site. Stripe remains deliberately disabled until an optional paid product is defined; it is never a publication prerequisite.
