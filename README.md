# Good Fun Movie

Rank movies by **Good** vs **Fun**, organized into decks. Each user has their own decks and movies.

## Environment separation (local vs preview vs production)

Use **different Turso databases and Clerk credentials** per tier so experiments and test users never touch production data.

| Tier | Where it runs | Turso | Clerk |
|------|---------------|--------|--------|
| **Local** | Your machine (`npm run dev` + `npm run dev:server`) | Optional dedicated DB **or** leave `TURSO_*` unset and use **`server/local.db`** SQLite fallback | Clerk **Development** instance → allow `http://localhost:5173` (and `:5174`, etc.) in [Paths](https://dashboard.clerk.com) |
| **Preview / staging** | Vercel **Preview** deployments (PRs and non‑production branch) | A **second** Turso database (e.g. `good-fun-movie-staging`) with its **own URL + token** | Same **Development** keys as local are fine → add **`https://<your-project>-*.vercel.app`** wildcard or each preview URL in Clerk |
| **Production** | Vercel **Production** (your main domain / production branch) | A **production** Turso database (e.g. `good-fun-movie-prod`) | Clerk **Production** keys (`pk_live_` / `sk_live_`) for that application → production domain(s) allowlisted |

**Turso:** create three databases (or skip a dedicated local DB if you rely on SQLite locally):

```bash
turso db create good-fun-movie-local    # optional if you prefer remote local too
turso db create good-fun-movie-staging
turso db create good-fun-movie-prod
turso db show <name> --url
turso db tokens create <name>
```

**Vercel:** In **Project → Settings → Environment Variables**, attach each variable to the right scope:

- **Production** → prod Turso + production Clerk keys + prod `VITE_CLERK_PUBLISHABLE_KEY`
- **Preview** → staging Turso + dev Clerk keys (and matching `VITE_*`) for preview deployments
- **Development** *(optional)* → values used when someone runs `vercel dev`

Never paste production secrets into the repo; use `.env` / `.env.local` locally (gitignored) and Vercel’s dashboard for deployed tiers.

### If you don't have production yet

It’s perfectly fine for now to:

- Use **one** shared Turso database (or SQLite locally + Turso only on Vercel—your choice).
- Use **only Clerk Development** (`pk_test_` / `sk_test_`) everywhere: local `.env`, `server/.env`, and Vercel.
- Put the **same** values into Vercel for **Production** until you introduce a real prod cutover (or duplicate them onto **Preview** too if you use preview URLs often—see below).

Nothing in this repo locks you into bad patterns: swapping URLs and tokens later is a **dashboard / `.env` change**, not an app refactor. When you go live:

1. Create a dedicated **Turso** database for prod; add **`TURSO_*`** only under Vercel **Production**.
2. Turn on Clerk **Production** keys and allowlist your real domain under Vercel **Production** (`VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`).
3. Optionally keep **`Preview`** deployments on staging Turso + dev Clerk keys so PRs don't touch prod data.

**Preview deployments:** If you open `*.vercel.app` previews and vars are scoped to **Production** only, those previews won't see your secrets—either add the same dev variables to **Preview**, or temporarily disable previews until you're ready to maintain two scopes.

---

## Local development

Install deps:

```bash
npm install
```

### Environment variables

**Frontend** (root `.env` or `.env.local`):

- `VITE_CLERK_PUBLISHABLE_KEY` – from [Clerk Dashboard](https://dashboard.clerk.com) → API Keys

**Backend** (`server/.env`):

- `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` – omit both to use local SQLite fallback (development only).
- `CLERK_PUBLISHABLE_KEY` – same Clerk app as `VITE_CLERK_PUBLISHABLE_KEY`.
- `CLERK_SECRET_KEY` – Clerk Dashboard → API Keys.
- `PORT=3001`
- `ENABLE_DB_INIT=true`

Start the API (Express):

```bash
npm run dev:server
```

Start the frontend (Vite):

```bash
npm run dev
```

- Frontend runs on `http://localhost:5173` (or next available port).
- API runs on `http://localhost:3001`.
- In dev, Vite proxies `/api/*` to `http://localhost:3001` (see `vite.config.ts`).

## Production (Vercel)

- Frontend is served by Vercel.
- Backend is served by Vercel serverless functions under `/api/*` (see `api/index.js`).
- Database is Turso/libSQL.
- Auth is Clerk.

### Required environment variables (Vercel)

- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `CLERK_SECRET_KEY`
- `VITE_CLERK_PUBLISHABLE_KEY`

Optional:

- `ENABLE_DB_INIT=false` (recommended in production)

### Clerk configuration

In the [Clerk Dashboard](https://dashboard.clerk.com), for **each** environment (typically Development vs Production):

1. Add the matching site URLs (localhost, preview `*.vercel.app`, production domain) under **Domains / Paths** where Clerk expects them.
2. Ensure **Authorized redirect / allowed origins** include those same origins so sign-in and API token validation succeed.

See **Environment separation** above for which keys belong on Preview vs Production in Vercel.

## Notes

- The frontend defaults to same-origin API calls. You normally **do not** need `VITE_API_BASE_URL`.
- Existing decks without an owner (from before auth) are not shown to any user.
