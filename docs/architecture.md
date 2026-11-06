# Architecture

Modular monolith in an npm-workspaces monorepo: `client/` (React SPA) and `server/` (Express API) with one PostgreSQL database.

```
Request -> Route -> Middleware (rate limit, authenticate, authorize, upload, validate)
        -> Controller (HTTP only) -> Service (rules, transactions) -> Prisma -> PostgreSQL
```

| Layer | Path | Responsibility |
|---|---|---|
| Domain | `server/src/domain` | Pure rules: `leaveDuration.js` (date-only math), `leaveWorkflow.js` (`planLeave`, `transition`) |
| Services | `services/` | `leave.service` (submit, decide, respond, cancel, list, detail), `access.service` (visibility + approver rules), `insights.service` (dashboards, analytics, calendar, notifications, audit feed), `document.service` (signature check, storage), `leaveEvents` (timeline + audit + notification writes) |
| Controllers/Routes | `controllers/`, `routes/index.js` | HTTP mapping; role gates |
| Middleware | `middlewares/` | session auth, role authorize, Zod validate, multer upload, rate limits, error handler |
| Storage | `utils/storage.js` | `save/read/remove` adapter: Cloudflare R2 when its three env vars are set, else local disk |

## Key mechanisms
- **Scope**: `visibleWhere(user)` (employee: own; manager: own and reports'; HOD: department) and `approverWhere(user)` (requests currently waiting on me) are reused by every list and by single-record loading (`loadVisibleRequest`, 404 if out of scope).
- **Transitions**: `transition(request, action)` returns the next `{status, approvalStage}` or throws 409; services then run a guarded `updateMany` with the expected previous state inside `prisma.$transaction`. `count !== 1` means someone else won the race -> 409.
- **Overlap**: checked inside the create transaction behind `pg_advisory_xact_lock(hash(employeeId))`, so simultaneous submissions by one employee cannot both pass.
- **Audit**: written by services only. `AuditLog` has a Postgres trigger that rejects UPDATE/DELETE.
- **Uploads**: multer memory storage (5 MB, 5 files) -> signature check (PDF/JPEG/PNG) -> random storage key -> files written before the transaction and removed if it fails. Downloads are served only through `GET /api/leaves/:id/documents/:docId` after the same visibility check.
- **Frontend**: TanStack Query for server state; one mutation helper invalidates leaves, detail, dashboards, analytics, notifications, calendar and audit together. List filters live in the URL (`useListParams`). Role navigation in `AppLayout`; routes are role-gated and lazy-loaded.

Extensibility for P2: services are the only place that read/write leave data, so an AI summary or policy copilot can be added as another service that consumes `leaveService.get` and `LeavePolicy` without touching the workflow.

## Runtime and deployment shape
- **One origin.** In production Express serves the built React app (`client/dist`) and falls back to `index.html` for client routes, and serves the API under `/api`. The browser and API share an origin, so the session cookie is first-party (`COOKIE_SAMESITE=lax`) and CORS is not involved.
- **One image.** The root `Dockerfile` builds the client in a first stage and ships only the server, its production dependencies and `client/dist` in the second. Migrations are run separately with `npm run db:deploy`.
- **External services.** PostgreSQL on Supabase (session pooler), documents on Cloudflare R2, hosting on Render. See [deployment.md](deployment.md).
- **Further reading:** [features.md](features.md) explains each feature and function; [api-documentation.md](api-documentation.md) lists the endpoints.
