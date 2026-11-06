# Database design (PostgreSQL + Prisma)

Source of truth: `server/prisma/schema.prisma`; migration `server/prisma/migrations/*_leaveflow_init` (includes the audit trigger as raw SQL).

| Model | Key fields / constraints |
|---|---|
| Department | `name` unique, `hodId` unique -> User |
| User | `email` unique, `role` EMPLOYEE/MANAGER/HOD, `departmentId`, `managerId` (self-relation); indexes on both |
| LeaveRequest | `employeeId`, `fromDate`/`toDate` (`@db.Date`), `reason`, `daysCount`, `requiresHodApproval`, `status`, `approvalStage`; indexes `(employeeId)`, `(status, approvalStage)`, `(fromDate, toDate)` |
| LeaveDocument | `leaveRequestId` (cascade), `originalName`, `mimeType`, `fileSize`, `storageKey` unique, `uploadedById` |
| ApprovalAction | timeline: `actorId`, `actorRole`, `action` (SUBMITTED, APPROVED, REJECTED, INFO_REQUESTED, COMMENT, EMPLOYEE_RESPONSE, CANCELLED), `stage`, `comment`; index `(leaveRequestId, createdAt)` |
| AuditLog | `actorId?`, `entityType`, `entityId`, `action`, `oldValue`/`newValue`/`metadata` JSON; index `(entityType, entityId, createdAt)`; **append-only trigger** |
| Notification | `userId`, `title`, `message`, `type`, `relatedEntityId`, `isRead`; index `(userId, isRead, createdAt)` |
| LeavePolicy | `longLeaveThreshold` (3), `dayCountingMethod` (`CALENDAR`), `documentRequired` (true) |

Enums: `Role`, `LeaveStatus` (PENDING_MANAGER, PENDING_HOD, NEEDS_INFO, APPROVED, REJECTED, CANCELLED), `ApprovalStage` (MANAGER, HOD, NONE), `ActionType`.

Notes
- `ApprovalAction` is the user-facing timeline; `AuditLog` is the system record (also covers document uploads and stores before/after state).
- Notification types: LEAVE_SUBMITTED, MANAGER_APPROVED, MANAGER_REJECTED, HOD_APPROVAL_REQUIRED, HOD_APPROVED, HOD_REJECTED, INFO_REQUESTED, EMPLOYEE_RESPONSE, LEAVE_CANCELLED, FINAL_DECISION (single-stage approvals).
- Dates are `DATE` columns, serialised as `YYYY-MM-DD`.
- Test cleanup uses `TRUNCATE` (the trigger blocks row-level UPDATE/DELETE only). `prisma migrate reset` drops and recreates the database.
