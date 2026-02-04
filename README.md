# Good Fun Movie

Rank movies by **Good** vs **Fun**, organized into decks.

## Local development

Install deps:

```bash
npm install
```

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

### Required environment variables (Vercel)

- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`

Optional:

- `ENABLE_DB_INIT=false` (recommended in production)

## Notes

- The frontend defaults to same-origin API calls. You normally **do not** need `VITE_API_BASE_URL`.
