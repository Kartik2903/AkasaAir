# Testing

| Command | What |
|---|---|
| `npm test` | server (Vitest + Supertest, real PostgreSQL) then client (Vitest + Testing Library) |
| `npm run test:coverage` | same with coverage |
| `npm run lint` | ESLint, both workspaces |

Server tests use their own database and **truncate it**:
```
docker exec <pg-container> psql -U postgres -c 'CREATE DATABASE leaveflow_test'
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/leaveflow_test npx prisma migrate deploy --schema server/prisma/schema.prisma
```
Override with `TEST_DATABASE_URL`. Uploads go to `server/uploads-test` and are deleted afterwards.

## Coverage of the 20 required scenarios
`server/tests/domain.test.js` (pure rules: 1/3/4-day boundaries, month/year/DST edges, every transition and invalid transition) and `server/tests/workflow.test.js`:
1-3 short/long submission and mandatory document; 4 manager approval moves to HOD; 5 manager rejection final; 6-7 HOD approve/reject; 8-9 manager and HOD info requests; 10 response resumes the same stage; 11-14 scoping and self-approval; 15 overlap (submit and preview); 16 invalid transitions (409); 17 concurrent approvals (exactly one 200) and approve-vs-cancel; 18 audit events incl. document uploads; 19 notifications; 20 document download authorization. Also: append-only audit trigger, upload size/signature checks, dashboards, analytics, calendar privacy, notifications, search/filter.

Client (`client/src/features/leaves/leaves.test.jsx`): date-only formatting, status badge, approval timeline, decision dialog validation, requests list loading/empty/error/retry.

Run results below were produced on a developer machine. The deployed Render service was not covered by these automated tests.

## Results from the last run in this repo
Server 41/41, client 8/8, lint clean, `vite build` succeeds. A scripted headless-Chrome run drove the real UI through the four-day lifecycle against the running API and confirmed each step (preview, document gate, approvals, info request, response, final approval, notification bell) and no horizontal overflow at 375px. Re-run on your machine to confirm.
