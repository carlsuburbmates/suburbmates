# SuburbMates: required context before work

Before any material audit, implementation, migration, release, or Ops action:

1. run the repository bootstrap and refresh `origin/main`;
2. read the authority in this order:
   - `docs/REFERENCE/SuburbMates — Decision Log.md`;
   - `docs/REFERENCE/SuburbMates — Target State and Operating Authority.md`;
   - `docs/REFERENCE/SuburbMates — Complete User Journey Map.md`;
   - the relevant detailed specification only where it agrees with those documents;
3. read `docs/HANDOVER.md` for current factual state, and `docs/OPS/PUBLIC_RELEASE_ACCEPTANCE.md` for remaining release evidence;
4. retrieve the current Linear issue and its comments before treating a task as ready or complete.

Live production, the remote database and `origin/main` are factual evidence; a chat summary, local branch or old report is not. Record an observed contradiction before changing behaviour.

The public directory is released. `/ops` and private workflows remain protected. Stripe, general outbound email, AI publication, bulk ABN checks and automated media processing remain disabled unless the owner explicitly changes that policy. Do not create fake durable production records merely to satisfy acceptance.

