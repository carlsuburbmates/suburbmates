# SuburbMates

Cloudflare-first production baseline for `suburbmates.com.au`.

## What this repo does today

- Serves the apex host `suburbmates.com.au`
- Redirects `www.suburbmates.com.au` to the apex with HTTP `308`
- Exposes `/healthz` for deployment checks
- Gives Cloudflare a stable production artifact before the full app rebuild

## Local checks

```bash
npm install
npm run check
```

## Deploy

```bash
npm run deploy
```

## Cutover sequence

1. Confirm the Worker deploy succeeds and the Cloudflare temporary URL serves correctly.
2. Add `suburbmates.com.au` as a Cloudflare zone.
3. Recreate the required DNS records in Cloudflare before changing nameservers.
4. Change the registrar nameservers from Vercel DNS to the Cloudflare-assigned nameservers.
5. Attach `suburbmates.com.au` to the Cloudflare production service.
6. Keep `www.suburbmates.com.au` as a redirect-only hostname to the apex.
7. Remove `suburbmates.com.au` and `www.suburbmates.com.au` from Vercel after the Cloudflare cutover is serving live traffic correctly.

## DNS records to recreate in Cloudflare

The domain is still delegated to Vercel DNS, so the zone migration is not complete until these are recreated inside Cloudflare:

- Apex production routing for `suburbmates.com.au`
- `www` hostname support for the redirect path
- Mail verification and delivery records for Resend
- Any records required for `info.suburbmates.com.au`

Do not treat old Vercel environment variables as source of truth. Stripe remains out of scope for this migration.
