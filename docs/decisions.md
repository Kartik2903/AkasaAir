# Decision log

| # | Decision | Why / trade-off |
|---|---|---|
| 1 | Convert the starter in place, keep JavaScript | 3-hour budget; Zod gives runtime validation. TypeScript would cost setup time. |
| 2 | Inclusive calendar days, isolated in `leaveDuration.js`, `LeavePolicy` row for the threshold | Matches the brief; easy to swap for working days. |
| 3 | Pure `transition()` + guarded `updateMany` in a transaction | Explicit states, no client-supplied status, race-safe without table locks. |
| 4 | `status` and `approvalStage` separate | NEEDS_INFO keeps the stage so the loop resumes correctly. |
| 5 | Visibility and approver rules in one module; out-of-scope = 404 | No duplicated checks; existence of others' requests is not revealed. |
| 6 | Audit append-only via DB trigger (plus no write API) | Protects history even from application bugs. TRUNCATE still works for tests. |
| 7 | Employee-with-HOD-manager is single stage; HODs cannot apply | No approver above the HOD in the data model; documented limitation. |
| 8 | Preview endpoint reuses submit rules | One implementation of the rules, the UI only renders messages. |
| 9 | HttpOnly cookie JWT, no public registration | XSS-safer than localStorage; accounts come from the seed. |
| 10 | Storage adapter: Cloudflare R2 when configured, else local disk | Same save/read/remove interface; Render's disk is ephemeral. |
| 11 | Accent changed from the starter's orange to indigo, tokens only | Matches the requested restrained palette. |
| 12 | Fresh `leaveflow` databases instead of resetting the old one | `prisma migrate reset` needs explicit consent; the old starter DB is untouched. |
| 13 | One Docker image serves the API and the built client | Single origin, first-party cookie, one Render service. |
| 14 | Render + Supabase + R2 instead of Fly.io | Fly flagged the account for verification; Supabase and R2 were already set up. |
| 15 | Supabase session pooler with `connection_limit=3` | Direct connections are IPv6-only; Prisma's default pool exceeds the pooler's session limit. |
| 16 | Demo accounts shown on the production login screen | Assessors cannot register; the data is throwaway. Documented in security.md. |
| 17 | Removed template leftovers (AWS notes, starter docs, unused helpers) | Keeps the repo about LeaveFlow only. |
