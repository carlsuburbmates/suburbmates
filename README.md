# SuburbMates

SuburbMates is a public, hyper-local business directory for the City of Darebin. Qualifying businesses from approved sources can become public unclaimed listings through the deterministic evidence policy; raw public submissions, ownership claims and owner changes remain private and moderated until their permitted decision.

## Start here in a new session

Read [`AGENTS.md`](AGENTS.md) first. It gives the required refresh and authority order. The durable product authority is the [Decision Log](docs/REFERENCE/SuburbMates%20%E2%80%94%20Decision%20Log.md), [Target State](docs/REFERENCE/SuburbMates%20%E2%80%94%20Target%20State%20and%20Operating%20Authority.md) and [Complete User Journey Map](docs/REFERENCE/SuburbMates%20%E2%80%94%20Complete%20User%20Journey%20Map.md). [`docs/HANDOVER.md`](docs/HANDOVER.md) is the current-state record; Linear holds the current work queue and acceptance evidence.

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
