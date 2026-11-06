# Security

Implemented, with the test that covers it where one exists (`server/tests/workflow.test.js`):
- Passwords hashed with bcrypt (cost 12 in the seed/prod path; constant-time-ish login with a dummy hash for unknown emails). Hash never returned.
- JWT (HS256, 1 day) in an HttpOnly cookie, `Secure` in production; the user is reloaded from the DB on every request.
- Authorization on the server: role gates plus scope rules in `access.service.js`. Tested: employee cannot read others' requests (404), manager outside their team (404), HOD outside their department (404), employees cannot approve, a manager cannot approve their own leave, a manager cannot bypass the HOD stage, document downloads blocked for out-of-scope users (404) and anonymous (401).
- Never trusting the client: employee id, role, status and stage are never accepted from the request body; transitions are validated by the state machine.
- Zod validation on body/query/params; Prisma parameterises queries; sort fields are allow-lists.
- Uploads: 5 MB, max 5 files, only PDF/JPEG/PNG by **file signature** (tested with a fake `.pdf`), random server-side names, sanitised display names, served as attachments with `Cache-Control: private, no-store`, only after an authorization check.
- Helmet, CORS limited to `CLIENT_ORIGIN` with credentials, login rate limit (20 per 15 min), general API limit (300/min), 100 kb JSON limit, env validated at boot.
- Concurrency: guarded updates inside transactions; an advisory lock on submissions (tested with simultaneous approvals and approve-vs-cancel).
- Audit trail is append-only at the database level (tested: UPDATE and DELETE raise).
- Errors hide internals in production.

Limits and decisions for you
- No CSRF token: protection is SameSite + restricted CORS. With `COOKIE_SAMESITE=none` (frontend and API on different sites) SameSite no longer protects; prefer one domain via a reverse proxy.
- No account lockout, MFA, password reset or refresh tokens. Demo users share a known password (`Password@123`), and the login screen advertises them on purpose so assessors can sign in without registering. The seeded data is throwaway; change or delete those users before any real use.
- Documents live in Cloudflare R2 (private bucket, accessed only with server-side credentials, never public URLs) or on local disk when R2 is not configured. Files are not virus-scanned; add malware scanning for real data. R2 encrypts at rest by default.
- The R2 credentials, `JWT_SECRET` and the database URL exist only as server environment variables (Render dashboard / local `.env`, which is git-ignored).
- In-memory rate limiter is per instance.
- Documents may contain sensitive health information; retention and access policy are out of scope here.
