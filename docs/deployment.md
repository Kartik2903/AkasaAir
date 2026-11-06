# Deployment

Status: configs are prepared; **no cloud deployment was performed**, so no URL is claimed. The Docker image for the API was built locally successfully; the Render Blueprint and AWS steps are unverified against live accounts.

## Environment variables
| Var | Where | Notes |
|---|---|---|
| NODE_ENV | API | `production` |
| PORT | API | default 4000 (Render sets it) |
| DATABASE_URL | API | Postgres URL; add `?connection_limit=10` to size the pool |
| JWT_SECRET | API | 32+ random chars; never commit |
| JWT_EXPIRES_IN | API | default `1d` |
| UPLOAD_DIR | API | folder for documents (local disk) |
| CLIENT_ORIGIN | API | exact frontend origin(s), comma-separated (CORS) |
| COOKIE_SAMESITE | API | `lax` (same site) or `none` (frontend and API on different sites; forces Secure) |
| VITE_API_URL | build of client | API origin; empty = same-origin (dev proxy) |

## Render (default)
1. Push the repo to GitHub. Copy `deployment/render/render.yaml` to the repo root as `render.yaml`.
2. Render > New > Blueprint > pick the repo. It creates Postgres, the API (web service) and the static site.
3. After first deploy set `CLIENT_ORIGIN` (API) to the static site URL and `VITE_API_URL` (static site) to the API URL, then redeploy both. `VITE_*` is baked at build time.
4. Migrations: the start command runs `prisma migrate deploy` (never `migrate dev`). Paid plans can use `preDeployCommand` instead.
5. Users: there is no registration. Create real users in the database; the demo seed (known password) is for local use only.
6. **Documents**: Render's disk is ephemeral, so uploaded files vanish on redeploy. Either attach a persistent disk (paid) and set `UPLOAD_DIR` to its mount path, or implement `server/src/utils/storage.js` with S3 (save/read/remove).

Monorepo notes: build commands run from the repo root with workspaces (`npm ci`, `-w client`); the static publish dir is `client/dist`; the SPA rewrite handles deep links. Free Postgres expires after 30 days; free web services sleep after idle.

Verification checklist
- [ ] `GET <api>/health` returns `{"status":"ok","db":"up"}`
- [ ] `<api>/api/docs` loads
- [ ] Frontend loads, deep link `/requests` refreshes without 404
- [ ] Log in, reload keeps the session (cookie Secure + SameSite=None)
- [ ] Submit a 4-day request with a PDF, approve as manager, then as HOD; timeline and audit show every step
- [ ] Download a document as an in-scope user; it fails for others
- [ ] Browser console shows no CORS errors

## AWS (alternative)
Nothing is provisioned by this repo. **Get explicit approval before creating any resource; these cost money.**

| Component | Service |
|---|---|
| React build | S3 (private) + CloudFront (OAC), custom error response 403/404 -> `/index.html` 200 |
| API | App Runner from the Docker image in ECR (or Elastic Beanstalk) |
| PostgreSQL | RDS (MySQL / SQL Server variants also RDS) |
| Secrets | Secrets Manager (`DATABASE_URL`, `JWT_SECRET`) injected as env |
| Documents | S3 private bucket + server-side encryption; implement the `storage` adapter (presigned URLs not needed, the API streams after its own auth check) |
| Logs | CloudWatch (App Runner ships stdout; pino logs JSON) |

Steps: (1) build/push `deployment/docker/Dockerfile.server` to ECR; (2) create RDS in private subnets, security group allowing only the App Runner VPC connector on 5432; (3) create App Runner service, port 4000, health check `/health`, env + secrets; (4) `npm run build -w client` with `VITE_API_URL=<api>`, upload `client/dist` to S3, front with CloudFront (HTTPS via ACM); (5) put frontend and API under one CloudFront domain (route `/api/*` to the API origin) to keep cookies same-site, then use `COOKIE_SAMESITE=lax`.
IAM: least privilege, an instance role that can read only its secrets, no long-lived access keys in the repo. Cost: RDS and App Runner bill while idle; use the smallest sizes and delete after the assessment.
Verification: same checklist as Render, plus CloudWatch log stream shows requests.

## Docker (optional)
`npm run db:up` starts Postgres (port 5433). Full stack: `JWT_SECRET=... docker compose -f deployment/docker/docker-compose.yml up --build`.
