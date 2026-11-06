# Deployment

Live: https://leaveflow.onrender.com (deployed by the project owner on Render's free tier; the automated tests in this repo were not run against it).

Target: **Render** (one Docker web service: API plus the built React app) with **Supabase** Postgres and **Cloudflare R2** for documents. The Docker image was built and run locally against Postgres.

## Environment variables
| Var | Notes |
|---|---|
| NODE_ENV | `production` |
| PORT | set by the host (Render); default 4000 locally |
| DATABASE_URL | Supabase **Session pooler** URI (`...pooler.supabase.com:5432/postgres`). Direct connections are IPv6-only; avoid the 6543 transaction pooler (migrations, advisory locks). URL-encode special characters in the password (`@` is `%40`). Append `?connection_limit=3`: Prisma's default pool exceeds the pooler's session limit and fails with "Can't reach database server" (seen while seeding) |
| JWT_SECRET | 32+ random chars; never commit |
| JWT_EXPIRES_IN | default `1d` |
| CLIENT_ORIGIN | the service's public origin (CORS) |
| COOKIE_SAMESITE | `lax` (the app and API share one origin) |
| STORAGE_BUCKET_API, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY | Cloudflare R2 documents. All three set = R2; otherwise local disk (`UPLOAD_DIR`, ephemeral on Render) |

## Steps
1. Migrate and seed the Supabase database from your machine (Render's free tier has no pre-deploy hook): with `DATABASE_URL` pointing at Supabase in `.env`, run `npm run db:deploy`, then seed with the URL ending `?connection_limit=2` (the `npm run db:seed` script reads `.env`). The seed creates demo users with the known password `Password@123`; for anything real, create your own users or change the passwords.
2. Push to GitHub. Render > New > Blueprint > pick the repo (`render.yaml` is at the root). Fill the `sync: false` variables. After the first deploy, set `CLIENT_ORIGIN` to the service URL.
3. The image builds the client and serves it from Express; deep links fall back to `index.html`.

Free Render web services sleep after inactivity; the first request wakes them (about a minute). Warm it before a demo.

## Verification checklist
- [ ] `GET /health` returns `{"status":"ok","db":"up"}`
- [ ] `/api/docs` loads; `/requests` refreshes without a 404
- [ ] Log in; reload keeps the session
- [ ] Submit a 4-day request with a PDF, approve as manager, then as HOD; timeline and audit show every step
- [ ] The document appears in the R2 bucket and downloads for an in-scope user only
- [ ] No CORS errors in the browser console

## Local
`npm run db:up` starts Postgres on port 5433. Build and run the image locally with `docker build -t leaveflow .`.

## Rebuilding and troubleshooting
- **Redeploy:** pushing to `main` redeploys automatically. To rebuild without a push: Render dashboard, the `leaveflow` service, **Manual Deploy**, **Deploy latest commit** (or **Clear build cache & deploy**).
- **Change an environment variable:** service, **Environment**, edit, save (Render redeploys).
- **`CLIENT_ORIGIN`** must equal the service URL, with no trailing slash.
- **Database unreachable:** the URL must be the session pooler string with the password URL-encoded and `?connection_limit=3` at the end.
- **First request slow:** free services sleep when idle.
- **Schema change:** run `npm run db:deploy` against Supabase before deploying code that needs it.
