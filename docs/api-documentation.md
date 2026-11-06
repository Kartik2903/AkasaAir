# API documentation

Interactive OpenAPI: `GET /api/docs` (source `server/src/docs/openapi.js`). Health: `GET /health`. All routes below are under `/api` and need the session cookie, except login/logout. Out-of-scope records return 404; wrong role returns 403.

| Method | Path | Who | Notes |
|---|---|---|---|
| POST | /auth/login | public (rate limited) | sets HttpOnly cookie |
| POST | /auth/logout | any | clears cookie |
| GET | /auth/me | any | profile |
| GET | /leaves/preview?fromDate&toDate | any | days, document/HOD requirement, overlap, approvers |
| GET | /leaves | any | `scope=mine\|pending\|team` (pending/team: MANAGER, HOD), `search` (employee name), `status`, `stage`, `from`, `to`, `sortBy=createdAt\|fromDate`, `sortOrder`, `page`, `limit` |
| POST | /leaves | EMPLOYEE, MANAGER | multipart: `fromDate`, `toDate`, `reason`, `documents[]` |
| GET | /leaves/:id | in scope | detail + `timeline`, `stages`, `documents`, `permissions` |
| POST | /leaves/:id/documents | owner, open request | multipart `documents[]` |
| GET | /leaves/:id/documents/:docId | in scope | file download |
| POST | /leaves/:id/respond | owner | multipart `comment`, `documents[]`; only from NEEDS_INFO |
| POST | /leaves/:id/cancel | owner | open requests only |
| POST | /leaves/:id/approve | current approver | optional `comment` |
| POST | /leaves/:id/reject | current approver | `comment` (5+ chars) required |
| POST | /leaves/:id/request-info | current approver | `comment` (5+ chars) required |
| GET | /leaves/:id/audit | in scope | chronological audit trail |
| GET | /audit | MANAGER, HOD | audit feed for visible requests, paginated |
| GET | /dashboard/employee, /manager, /hod | matching role (manager endpoint: MANAGER, hod: HOD, employee: EMPLOYEE/MANAGER) | |
| GET | /analytics/leave-trends | any (scoped) | `trend`, `byStatus`, `byEmployee` |
| GET | /analytics/approval-workload | MANAGER, HOD | |
| GET | /calendar/team?month=YYYY-MM&employeeId | any (scoped) | entries only: person, dates, APPROVED/PENDING |
| GET | /notifications | any | `meta.unread` |
| PATCH | /notifications/:id/read, /notifications/read-all | owner | |

Response: `{ "success": true, "message": "...", "data": ..., "meta": {...} }`. Errors: `{ "success": false, "message": "Validation failed", "errors": [{ "field": "body.reason", "message": "..." }] }`. Statuses used: 200, 201, 400, 401, 403, 404, 409 (invalid transition, already actioned, overlap), 429, 500.
