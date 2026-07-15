# SuburbMates

SuburbMates is a public, hyper-local business directory for the City of Darebin, with Northcote as the current priority. The directory publishes real business listings even when contact information is incomplete. A business owner can later claim and enrich a listing.

Read [`docs/HANDOVER.md`](docs/HANDOVER.md) before changing the project. It is the canonical project context, current-state record, operating guide, and next-work queue.

## Core commands

```bash
npm install
npm run check
npm run audit -- data/vendor-candidates-merged.csv
npm run seed -- --dry-run data/vendor-candidates-merged.csv
npm run catalogue:report -- data/vendor-candidates-merged.csv
```

The web application lives in `web/`. Run its checks from that directory:

```bash
npm install
npm run lint
npm run build
```

Stripe and Cloudflare configuration remain in the repository and connected accounts. They are intentionally outside the current vendor-catalogue workstream.
