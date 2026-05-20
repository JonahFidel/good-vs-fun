# Good Fun Movie

Rank movies by **Good** vs **Fun**, organized into decks. Each user has their own decks and movies.

## Local development

Install deps:

```bash
npm install
```

### Environment variables

**Frontend** (root `.env` or `.env.local`):

- `VITE_CLERK_PUBLISHABLE_KEY` – from [Clerk Dashboard](https://dashboard.clerk.com) → API Keys

**Backend** (`server/.env`):

- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `CLERK_SECRET_KEY` – from Clerk Dashboard → API Keys
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

In the [Clerk Dashboard](https://dashboard.clerk.com):

1. Add your production URL (e.g. `https://your-app.vercel.app`) to **Allowed redirect URLs**.
2. Add `https://your-app.vercel.app` to **Allowed origins** for CORS.

## Notes

- The frontend defaults to same-origin API calls. You normally **do not** need `VITE_API_BASE_URL`.
- Existing decks without an owner (from before auth) are not shown to any user.
