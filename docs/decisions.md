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
| 10 | Local-disk storage behind a 3-function adapter | Simple locally; S3 swap is one file. Ephemeral on Render without a disk. |
| 11 | Accent changed from the starter's orange to indigo, tokens only | Matches the requested restrained palette. |
| 12 | Fresh `leaveflow` databases instead of resetting the old one | `prisma migrate reset` needs explicit consent; the old starter DB is untouched. |
