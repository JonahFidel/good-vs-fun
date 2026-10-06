# Good Fun Movie

Rank movies by **Good** vs **Fun**, organized into decks. Each user has their own decks and movies.

## Workspace

The repo is an npm workspace.
`.npmrc` sets `install-strategy=linked`, so each package only sees the dependencies it declares.
Vite and Metro each get their own install root.
The workspace root depends on `@types/react` and `@types/react-dom` so TypeScript can resolve React types for packages in the linked store.
`web/` is the Vite site, versioned on its own in `web/package.json`.
`server/` is the Express API, versioned on its own in `server/package.json`.
`mobile/` is the Expo app, versioned on its own in `mobile/package.json`.
`packages/shared` is the only shared code: deck and movie types, score rules, API paths, and title casing.
Screens, CSS, and the browser chart stay in `web/`.
The native screens stay in `mobile/`.
A website deploy builds only `web/`.
A store build is `mobile/`, so it does not republish the site.

## Local development

Install deps from the repo root:

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

Start the Expo app:

```bash
npm run dev:mobile
```

On Android, from `mobile/` after the emulator is up:

```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
emulator -avd Pixel_Fold_API_35 -no-snapshot -gpu auto
npm run android
```

- Frontend runs on `http://localhost:5173` (or next available port).
- API runs on `http://localhost:3001`.
- In dev, Vite proxies `/api/*` to `http://localhost:3001` (see `web/vite.config.ts`).
- The Expo app reads `EXPO_PUBLIC_API_BASE_URL` from the repo root `.env`.
- If that is unset, it falls back to `http://localhost:3001`, which the Android emulator cannot reach.
- It uses the same Clerk publishable key as the website (`VITE_CLERK_PUBLISHABLE_KEY` in the root `.env`).
- Sign in with an email code or Log in with Google for an existing account.
- Rename uses the iOS alert on iPhone and an in-app field on Android, because `Alert.prompt` is iOS-only.

## Production (Vercel)

- Frontend is served by Vercel from `web/dist`.
- That deploy does not build or publish a store app.
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
