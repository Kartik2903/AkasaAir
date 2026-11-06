# API documentation

Interactive OpenAPI (Swagger UI): `GET /api/docs` (source `server/src/docs/openapi.js`). Health check: `GET /health` returns `{ "status": "ok", "db": "up" }` or 503.

All routes are under `/api` and need the session cookie except login and logout. Wrong role returns **403**; a record outside your scope returns **404**.

## Envelope and errors
```json
{ "success": true, "message": "Leave requests retrieved successfully", "data": [], "meta": { "page": 1, "limit": 10, "total": 7, "totalPages": 1 } }
{ "success": false, "message": "Validation failed", "errors": [{ "field": "body.reason", "message": "Please give a short reason (5+ characters)" }] }
```
| Status | Meaning |
|---|---|
| 200 / 201 | success / created |
| 400 | validation failed (Zod), missing required document, bad file type |
| 401 | no or invalid session; wrong credentials |
| 403 | role not allowed (for example an employee approving, a HOD applying) |
| 404 | not found or out of your scope |
| 409 | invalid transition, request already actioned, overlapping dates |
| 429 | rate limited (login 20 per 15 min, API 300 per minute) |
| 500 | unexpected error (details hidden in production) |

## Auth
| Method | Path | Who | Notes |
|---|---|---|---|
| POST | /auth/login | public, rate limited | body `{ email, password }`; sets the HttpOnly cookie; returns the profile |
| POST | /auth/logout | any | clears the cookie |
| GET | /auth/me | signed in | `{ id, name, email, role, departmentId, department, managerName }` |

## Leave requests
| Method | Path | Who | Notes |
|---|---|---|---|
| GET | /leaves/preview?fromDate&toDate | signed in | dry run, never writes (see example) |
| GET | /leaves | signed in | query: `scope=mine\|pending\|team` (pending/team need MANAGER or HOD), `search` (employee name), `status`, `stage`, `from`, `to`, `sortBy=createdAt\|fromDate`, `sortOrder`, `page`, `limit` (max 100) |
| POST | /leaves | EMPLOYEE, MANAGER | multipart: `fromDate`, `toDate`, `reason`, `documents[]`. Document required when days > 3 |
| GET | /leaves/:id | in scope | request + `documents`, `stages`, `timeline`, `permissions` |
| POST | /leaves/:id/documents | owner, open request | multipart `documents[]` |
| GET | /leaves/:id/documents/:docId | in scope | file download, `Cache-Control: private, no-store` |
| POST | /leaves/:id/respond | owner | multipart `comment` (3+ chars), `documents[]`; only from NEEDS_INFO |
| POST | /leaves/:id/cancel | owner | open requests only |
| GET | /leaves/:id/audit | in scope | chronological audit trail |

## Decisions
| Method | Path | Who | Body |
|---|---|---|---|
| POST | /leaves/:id/approve | the current approver | optional `comment` |
| POST | /leaves/:id/reject | the current approver | `comment`, 5+ chars, required |
| POST | /leaves/:id/request-info | the current approver | `comment`, 5+ chars, required |

The current approver is the employee's manager at the MANAGER stage and the department's HOD at the HOD stage. Approving a finished or already-actioned request returns 409.

## Dashboards, analytics, calendar, audit, notifications
| Method | Path | Who | Notes |
|---|---|---|---|
| GET | /dashboard/employee | EMPLOYEE, MANAGER | `total, approved, rejected, pending, needsInfo, upcoming[], recentActivity[]` |
| GET | /dashboard/manager | MANAGER | `pendingApprovals, awaitingInfo, approved, rejected, onLeaveNow[], upcoming[], workload` |
| GET | /dashboard/hod | HOD | same shape, department-wide |
| GET | /analytics/leave-trends | signed in, scoped | `trend[]` per month, `byStatus[]`, `byEmployee[]` (approved days) |
| GET | /analytics/approval-workload | MANAGER, HOD | `pendingNow, awaitingInfo, byMonth[]` (approved, rejected, infoRequested) |
| GET | /calendar/team?month=YYYY-MM&employeeId | signed in, scoped | person, dates, APPROVED or PENDING; no reasons or documents |
| GET | /audit | MANAGER, HOD | audit feed for visible requests, paginated |
| GET | /notifications | signed in | `data.items[]`, `data.unread` |
| PATCH | /notifications/:id/read | owner | |
| PATCH | /notifications/read-all | owner | |

## Examples
Sign in and keep the cookie:
```bash
curl -c jar -X POST https://leaveflow.onrender.com/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"employee@leaveflow.dev","password":"Password@123"}'
```
Preview a four-day request:
```bash
curl -b jar 'https://leaveflow.onrender.com/api/leaves/preview?fromDate=2026-12-01&toDate=2026-12-04'
```
```json
{ "success": true, "data": {
  "valid": true, "days": 4, "requiresDocument": true, "requiresHodApproval": true,
  "messages": ["This request covers 4 consecutive days.", "This request requires manager and HOD approval.", "A supporting document is required for this request."],
  "approvers": [{ "stage": "MANAGER", "name": "Meera Menon" }, { "stage": "HOD", "name": "Harish Oberoi" }],
  "overlap": null } }
```
Submit it with a document:
```bash
curl -b jar -X POST https://leaveflow.onrender.com/api/leaves \
  -F fromDate=2026-12-01 -F toDate=2026-12-04 -F reason='Family function' -F documents=@note.pdf
```
Approve as the manager (after signing in as `manager@leaveflow.dev`):
```bash
curl -b jar -X POST https://leaveflow.onrender.com/api/leaves/<id>/approve -H 'content-type: application/json' -d '{"comment":"Approved"}'
```
`GET /leaves/:id` includes `permissions` so the UI shows only valid actions:
```json
"permissions": { "canDecide": false, "canRespond": true, "canCancel": true, "canUpload": true }
```
