# Features and how they work

LeaveFlow is an employee leave management system. Three roles use it: **EMPLOYEE**, **MANAGER** and **HOD** (head of department). This page explains each feature and the main functions behind it. Endpoint details are in [api-documentation.md](api-documentation.md); structure is in [architecture.md](architecture.md).

## 1. Sign-in and roles
- **Login** (`POST /api/auth/login`): email and password. The server checks a bcrypt hash and sets a signed JWT (HS256, 1 day) in an HttpOnly cookie. The browser never reads the token. There is no public registration; users come from the seed. The login screen lists the demo accounts for quick testing.
- **Roles are enforced on the server.** `authenticate` loads the user from the database on every request, `authorize(...roles)` gates routes, and `access.service.js` decides which records a user may see or act on. The client only hides buttons; the API refuses anyway.
- **Who sees what:** an employee sees their own requests. A manager sees their own and their direct reports'. A HOD sees everything in their department. A record outside your scope returns **404**, so its existence is not revealed.

## 2. Applying for leave
- **Form** (`/apply`): from date, to date, reason (5+ characters) and documents (PDF, JPG or PNG, 5 MB each, up to 5).
- **Duration:** inclusive calendar days, so 10 Nov to 10 Nov is 1 day and 10 Nov to 13 Nov is 4. Dates are handled as `YYYY-MM-DD` and parsed as UTC, so timezones can never shift a day (`server/src/domain/leaveDuration.js`).
- **Live validation preview** (`GET /api/leaves/preview`): while you pick dates, the server reports the number of days, whether a document is required, whether HOD approval is needed, who the approvers are and whether the dates overlap another of your requests. It uses the same rules as the real submit, so the screen shows messages and holds no business logic. Submit stays disabled until a required document is attached.
- **Rules applied on submit** (`planLeave` in `leaveWorkflow.js`, `leave.service.create`): more than 3 days needs a document and a second (HOD) approval; overlapping requests are rejected with 409, checked inside the transaction behind a per-employee advisory lock so two simultaneous submissions cannot both pass. A manager's own leave goes to the HOD in a single stage. HODs cannot apply (no approver above them).

## 3. Approval workflow
`status` (where the request is) and `approvalStage` (who must act) are separate fields.

| Situation | Result |
|---|---|
| 1 to 3 days | `PENDING_MANAGER`, manager approves, `APPROVED` |
| 4+ days | `PENDING_MANAGER`, manager approves, `PENDING_HOD`, HOD approves, `APPROVED` |
| Reject (comment required) | `REJECTED` at once, at either stage |
| Request more information (comment required) | `NEEDS_INFO`, stage unchanged |
| Employee responds | back to `PENDING_<same stage>`, no re-approval by the manager |
| Employee cancels an open request | `CANCELLED` |

- **One state machine:** `transition(request, action)` is a pure function that returns the next `{status, approvalStage}` or throws 409. The client never sends a status.
- **Race safety:** each action runs in one database transaction with a guarded `UPDATE ... WHERE id AND status = expected AND approvalStage = expected`. If someone else acted first the update touches 0 rows and the caller gets 409. Three simultaneous approvals produce exactly one success.
- **Side effects in the same transaction:** a timeline entry (`ApprovalAction`), an audit row (`AuditLog`) and notifications for the next actor or the employee (`leaveEvents.js`).
- **Self-approval is blocked:** an approver can never act on their own request.

## 4. Documents
Stored in **Cloudflare R2** when `STORAGE_BUCKET_API`, `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY` are set, otherwise on local disk (`server/src/utils/storage.js`, same `save/read/remove` interface). Files are type-checked by their first bytes (not the filename), stored under random keys, and downloadable only through `GET /api/leaves/:id/documents/:docId` after the same visibility check as the request. Files written before a failed transaction are deleted again.

## 5. Request history, search and detail
- **My requests / Approvals / Team requests** (`/requests`, `/approvals`, `/team-requests`) use `GET /api/leaves` with `scope=mine|pending|team`, employee-name search, status, stage and date filters, sorting and pagination. Filters live in the URL, so views can be bookmarked.
- **Detail page** (`/requests/:id`): request facts, documents, the **approval timeline** (submitted, manager decision, info request, employee response, final decision; the current stage is emphasised) and the actions the server says you may take (`permissions`: `canDecide`, `canRespond`, `canCancel`, `canUpload`).

## 6. Dashboards and analytics
- **Employee:** totals by status, upcoming approved leave, recent activity.
- **Manager and HOD:** pending approvals, requests awaiting information, who is on leave now, upcoming leave, decisions in the last 30 days.
- **Charts** (Recharts, all from stored data): monthly leave trend, status split, approved days per person, and approval workload per month. Scoped by role.

## 7. Team calendar
`GET /api/calendar/team?month=YYYY-MM` returns who is away and when: person, dates and APPROVED or PENDING. It never returns reasons or documents. Month navigation, a person filter and a day detail panel on the page.

## 8. Notifications
Created by the workflow in the same transaction as the change: request submitted, manager approved or rejected, HOD approval required, HOD approved or rejected, information requested, employee responded, cancelled, final decision. The bell in the header shows the unread count (30 second polling) and links to the request; there is also a full list page and "mark all read".

## 9. Audit
Every state change and document upload writes an `AuditLog` row with actor, entity, action and before/after values. A PostgreSQL trigger rejects `UPDATE` and `DELETE`, so history cannot be edited even by application bugs. Managers and HODs get a searchable audit page for the requests they can see; each request also has its own trail (`GET /api/leaves/:id/audit`).

## 10. Interface
Responsive layout with a role-aware sidebar, dark mode, a Ctrl+K command palette, and loading, empty and error states on every list. Status is always shown as a text label, colour only reinforces it. See [ui-system.md](ui-system.md).

## Main functions (where to look)
| Function | File | Purpose |
|---|---|---|
| `countDays(from, to, method)` | `domain/leaveDuration.js` | inclusive day count, one place to change the counting rule |
| `planLeave({days, policy, approverIsHod})` | `domain/leaveWorkflow.js` | decides document and HOD requirements and the first stage |
| `transition(request, action)` | `domain/leaveWorkflow.js` | the full state machine, or a 409 |
| `visibleWhere(user)`, `approverWhere(user)` | `services/access.service.js` | scope for lists and "waiting on me" |
| `loadVisibleRequest(user, id)` | `services/access.service.js` | single-record access check, 404 if out of scope |
| `leaveService.preview/create/list/get` | `services/leave.service.js` | preview, submit, search, detail with timeline and permissions |
| `leaveService.decide/respond/cancel` | `services/leave.service.js` | guarded transitions with timeline, audit and notifications |
| `documentService.stage/read` | `services/document.service.js` | signature check, storage, rollback |
| `insightsService.*` | `services/insights.service.js` | dashboards, trends, workload, calendar, notifications, audit feed |
| `storage.save/read/remove` | `utils/storage.js` | R2 or local disk |
