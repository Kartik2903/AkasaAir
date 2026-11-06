import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { toSkipTake, buildMeta } from '../utils/pagination.js';
import { parseDate, formatDate, countDays } from '../domain/leaveDuration.js';
import { planLeave, transition, ACTIVE_STATUSES, OPEN_STATUSES, FINAL_STATUSES } from '../domain/leaveWorkflow.js';
import { visibleWhere, approverWhere, loadVisibleRequest, isApprover, approverIdFor, REQUEST_INCLUDE } from './access.service.js';
import { documentService } from './document.service.js';
import { recordEvent, writeAudit, snapshot } from './leaveEvents.js';

const DEFAULT_POLICY = { longLeaveThreshold: 3, dayCountingMethod: 'CALENDAR', documentRequired: true };
const getPolicy = async (db = prisma) => (await db.leavePolicy.findFirst()) ?? DEFAULT_POLICY;

const toDto = (r) => ({ ...r, fromDate: formatDate(r.fromDate), toDate: formatDate(r.toDate) });

async function findOverlap(db, employeeId, from, to, excludeId) {
  return db.leaveRequest.findFirst({
    where: { employeeId, status: { in: ACTIVE_STATUSES }, fromDate: { lte: to }, toDate: { gte: from }, ...(excludeId && { id: { not: excludeId } }) },
    select: { id: true, fromDate: true, toDate: true, status: true },
  });
}

const employeeCtx = (user) => prisma.user.findUnique({ where: { id: user.id }, select: { managerId: true, manager: { select: { id: true, name: true, role: true } }, department: { select: { hodId: true, hod: { select: { name: true } } } } } });

// ---- preview (same rules as submit; never writes) ----
async function preview(user, { fromDate, toDate }) {
  const messages = [];
  const from = parseDate(fromDate); const to = parseDate(toDate);
  if (!from || !to) return { valid: false, messages: ['Choose a start and end date.'] };
  if (to < from) return { valid: false, messages: ['The end date cannot be earlier than the start date.'] };
  const policy = await getPolicy();
  const ctx = await employeeCtx(user);
  if (!ctx?.manager) return { valid: false, messages: ['You have no reporting manager assigned, so a request cannot be routed.'] };
  const days = countDays(from, to, policy.dayCountingMethod);
  const plan = planLeave({ days, policy, approverIsHod: ctx.manager.role === 'HOD' });
  const overlap = await findOverlap(prisma, user.id, from, to);
  messages.push(`This request covers ${days} consecutive ${days === 1 ? 'day' : 'days'}.`);
  messages.push(plan.requiresHodApproval ? 'This request requires manager and HOD approval.' : 'Manager approval is required.');
  if (plan.requiresDocument) messages.push('A supporting document is required for this request.');
  if (overlap) messages.push(`You already have an overlapping leave request (${formatDate(overlap.fromDate)} to ${formatDate(overlap.toDate)}).`);
  return {
    valid: !overlap, ...plan, messages,
    approvers: [{ stage: 'MANAGER', name: ctx.manager.name }, ...(plan.requiresHodApproval ? [{ stage: 'HOD', name: ctx.department.hod?.name ?? 'Department HOD' }] : [])],
    overlap: overlap ? { id: overlap.id, fromDate: formatDate(overlap.fromDate), toDate: formatDate(overlap.toDate) } : null,
  };
}

// ---- create ----
async function create(user, { fromDate, toDate, reason }, files) {
  if (user.role === 'HOD') throw ApiError.forbidden('HODs have no approver above them; leave for HODs is not supported yet');
  const from = parseDate(fromDate); const to = parseDate(toDate);
  if (!from || !to) throw ApiError.badRequest('Invalid dates', [{ field: 'body.fromDate', message: 'Use YYYY-MM-DD' }]);
  if (to < from) throw ApiError.badRequest('Validation failed', [{ field: 'body.toDate', message: 'The end date cannot be earlier than the start date' }]);

  const policy = await getPolicy();
  const ctx = await employeeCtx(user);
  if (!ctx?.manager) throw ApiError.badRequest('You have no reporting manager assigned');
  const days = countDays(from, to, policy.dayCountingMethod);
  const plan = planLeave({ days, policy, approverIsHod: ctx.manager.role === 'HOD' });
  if (plan.requiresDocument && !files?.length)
    throw ApiError.badRequest('Validation failed', [{ field: 'documents', message: `A supporting document is required for leave longer than ${policy.longLeaveThreshold} days` }]);

  const staged = await documentService.stage(files, user.id);
  try {
    const created = await prisma.$transaction(async (tx) => {
      // Serialise concurrent submissions by the same employee so the overlap check cannot be raced.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${user.id}))`;
      const overlap = await findOverlap(tx, user.id, from, to);
      if (overlap) throw ApiError.conflict(`You already have an overlapping leave request (${formatDate(overlap.fromDate)} to ${formatDate(overlap.toDate)})`);

      const request = await tx.leaveRequest.create({
        data: { employeeId: user.id, fromDate: from, toDate: to, reason, daysCount: days, requiresHodApproval: plan.requiresHodApproval, status: 'PENDING_MANAGER', approvalStage: 'MANAGER' },
      });
      if (staged.rows.length) await tx.leaveDocument.createMany({ data: staged.rows.map((r) => ({ ...r, leaveRequestId: request.id })) });
      await recordEvent(tx, {
        request, actor: user, action: 'SUBMITTED', comment: reason,
        audit: { action: 'SUBMITTED', newValue: { ...snapshot(request), fromDate, toDate, daysCount: days }, metadata: { documents: staged.rows.length } },
        notify: [{ userId: ctx.manager.id, title: 'New leave request', message: `${user.name} requested ${days} ${days === 1 ? 'day' : 'days'} of leave (${fromDate} to ${toDate}).`, type: 'LEAVE_SUBMITTED' }],
      });
      for (const r of staged.rows) await writeAudit(tx, { actorId: user.id, entityId: request.id, action: 'DOCUMENT_UPLOADED', metadata: { originalName: r.originalName, fileSize: r.fileSize } });
      return request;
    });
    return toDto(created);
  } catch (e) { await staged.rollback(); throw e; }
}

// ---- list ----
async function list(user, q) {
  let where;
  if (q.scope === 'mine') where = { employeeId: user.id };
  else if (user.role === 'EMPLOYEE') throw ApiError.forbidden('Insufficient permissions');
  else if (q.scope === 'pending') where = { AND: [approverWhere(user), { status: { in: ['PENDING_MANAGER', 'PENDING_HOD'] } }] };
  else where = visibleWhere(user);

  const and = [where];
  if (q.search) and.push({ employee: { name: { contains: q.search, mode: 'insensitive' } } });
  if (q.status) and.push({ status: q.status });
  if (q.stage) and.push({ approvalStage: q.stage });
  if (q.from) and.push({ toDate: { gte: parseDate(q.from) ?? undefined } });
  if (q.to) and.push({ fromDate: { lte: parseDate(q.to) ?? undefined } });
  const finalWhere = { AND: and };

  const [items, total] = await Promise.all([
    prisma.leaveRequest.findMany({ where: finalWhere, include: REQUEST_INCLUDE, orderBy: { [q.sortBy]: q.sortOrder }, ...toSkipTake(q) }),
    prisma.leaveRequest.count({ where: finalWhere }),
  ]);
  return { items: items.map(toDto), meta: buildMeta(total, q.page, q.limit) };
}

// ---- detail (+ timeline, stages, permissions computed server-side) ----
async function get(user, id) {
  const request = await loadVisibleRequest(user, id, {
    ...REQUEST_INCLUDE,
    documents: { select: { id: true, originalName: true, mimeType: true, fileSize: true, createdAt: true, uploadedBy: { select: { name: true } } }, orderBy: { createdAt: 'asc' } },
    actions: { include: { actor: { select: { name: true } } }, orderBy: { createdAt: 'asc' } },
  });
  const manager = request.employee.managerId ? await prisma.user.findUnique({ where: { id: request.employee.managerId }, select: { name: true, role: true } }) : null;
  const hod = request.employee.department.hodId ? await prisma.user.findUnique({ where: { id: request.employee.department.hodId }, select: { name: true } }) : null;

  const stageNames = request.requiresHodApproval ? ['MANAGER', 'HOD'] : ['MANAGER'];
  const stages = stageNames.map((stage) => {
    const decided = request.actions.find((a) => a.stage === stage && (a.action === 'APPROVED' || a.action === 'REJECTED'));
    const state = decided ? (decided.action === 'APPROVED' ? 'done' : 'rejected')
      : request.approvalStage === stage && !FINAL_STATUSES.includes(request.status) ? (request.status === 'NEEDS_INFO' ? 'needs_info' : 'current') : 'pending';
    return { stage, state, approver: stage === 'MANAGER' ? manager?.name : hod?.name, approverRole: stage === 'MANAGER' ? manager?.role : 'HOD' };
  });

  const own = request.employeeId === user.id;
  const open = OPEN_STATUSES.includes(request.status);
  const { documents, actions, ...rest } = request;
  return {
    ...toDto(rest), documents, stages,
    timeline: actions.map((a) => ({ id: a.id, action: a.action, actorName: a.actor.name, actorRole: a.actorRole, stage: a.stage, comment: a.comment, createdAt: a.createdAt })),
    permissions: {
      canDecide: isApprover(user, request) && (request.status === 'PENDING_MANAGER' || request.status === 'PENDING_HOD'),
      canRespond: own && request.status === 'NEEDS_INFO',
      canCancel: own && open,
      canUpload: own && open,
    },
  };
}

// ---- workflow transitions ----
const NOTE = {
  approve: { MANAGER: 'MANAGER_APPROVED', HOD: 'HOD_APPROVED' },
  reject: { MANAGER: 'MANAGER_REJECTED', HOD: 'HOD_REJECTED' },
};

async function decide(user, id, action, comment) {
  return prisma.$transaction(async (tx) => {
    const request = await tx.leaveRequest.findFirst({ where: { id, ...visibleWhere(user) }, include: REQUEST_INCLUDE });
    if (!request) throw ApiError.notFound('Leave request not found');
    // Finished requests have no current approver: people who were in the chain get a state conflict (409), everyone else 403.
    const inChain = user.id !== request.employeeId && [request.employee.managerId, request.employee.department.hodId].includes(user.id);
    if (request.approvalStage === 'NONE' ? !inChain : !isApprover(user, request)) throw ApiError.forbidden('You are not the approver for this request at its current stage');

    const next = transition(request, action); // throws 409 for invalid state
    // Guarded update: only succeeds if nobody changed the request since we read it (double-click / concurrent approver).
    const res = await tx.leaveRequest.updateMany({ where: { id, status: request.status, approvalStage: request.approvalStage }, data: next });
    if (res.count !== 1) throw ApiError.conflict('This request was already actioned by someone else. Refresh to see the latest state.');

    const stage = request.approvalStage;
    const who = user.name; const when = `${formatDate(request.fromDate)} to ${formatDate(request.toDate)}`;
    const toEmployee = (title, message, type) => ({ userId: request.employeeId, title, message, type });
    const verb = { approve: 'approved', reject: 'rejected', 'request-info': 'needs more information' }[action];
    const notify = [];
    if (action === 'approve') {
      const final = next.status === 'APPROVED';
      notify.push(toEmployee(final ? 'Leave approved' : 'Manager approved your leave', final ? `Your leave (${when}) was approved by ${who}.` : `${who} approved your leave (${when}). It now awaits HOD approval.`, final && stage === 'MANAGER' && !request.requiresHodApproval ? 'FINAL_DECISION' : NOTE.approve[stage]));
      if (!final) notify.push({ userId: request.employee.department.hodId, title: 'HOD approval required', message: `${request.employee.name}'s leave (${when}) was approved by their manager and needs your decision.`, type: 'HOD_APPROVAL_REQUIRED' });
    } else if (action === 'reject') {
      notify.push(toEmployee('Leave rejected', `Your leave (${when}) was rejected by ${who}.${comment ? ` Reason: ${comment}` : ''}`, NOTE.reject[stage]));
    } else {
      notify.push(toEmployee('More information requested', `${who} needs more information on your leave (${when}): ${comment}`, 'INFO_REQUESTED'));
    }

    const updated = { ...request, ...next };
    await recordEvent(tx, {
      request: { ...updated, approvalStage: stage }, // action is logged against the stage it was taken at
      actor: user,
      action: { approve: 'APPROVED', reject: 'REJECTED', 'request-info': 'INFO_REQUESTED' }[action],
      comment,
      audit: { action: action === 'approve' ? 'APPROVED' : action === 'reject' ? 'REJECTED' : 'INFO_REQUESTED', oldValue: snapshot(request), newValue: snapshot(next), metadata: { stage, comment: comment ?? null, outcome: verb } },
      notify,
    });
    return toDto(updated);
  });
}

async function respond(user, id, { comment }, files) {
  const request = await loadVisibleRequest(user, id);
  if (request.employeeId !== user.id) throw ApiError.forbidden('Only the requester can respond');
  const staged = await documentService.stage(files, user.id);
  try {
    return await prisma.$transaction(async (tx) => {
      const fresh = await tx.leaveRequest.findUnique({ where: { id }, include: REQUEST_INCLUDE });
      const next = transition(fresh, 'respond'); // NEEDS_INFO -> PENDING_<same stage>
      const res = await tx.leaveRequest.updateMany({ where: { id, status: fresh.status, approvalStage: fresh.approvalStage }, data: next });
      if (res.count !== 1) throw ApiError.conflict('This request changed while you were responding. Refresh and try again.');
      if (staged.rows.length) await tx.leaveDocument.createMany({ data: staged.rows.map((r) => ({ ...r, leaveRequestId: id })) });
      const approverId = approverIdFor(fresh);
      await recordEvent(tx, {
        request: { ...fresh, ...next, approvalStage: fresh.approvalStage }, actor: user, action: 'EMPLOYEE_RESPONSE', comment,
        audit: { action: 'EMPLOYEE_RESPONSE', oldValue: snapshot(fresh), newValue: snapshot(next), metadata: { documents: staged.rows.length } },
        notify: [{ userId: approverId, title: 'Employee responded', message: `${user.name} responded to your information request.`, type: 'EMPLOYEE_RESPONSE' }],
      });
      for (const r of staged.rows) await writeAudit(tx, { actorId: user.id, entityId: id, action: 'DOCUMENT_UPLOADED', metadata: { originalName: r.originalName, fileSize: r.fileSize } });
      return toDto({ ...fresh, ...next });
    });
  } catch (e) { await staged.rollback(); throw e; }
}

async function cancel(user, id) {
  return prisma.$transaction(async (tx) => {
    const request = await tx.leaveRequest.findFirst({ where: { id, employeeId: user.id }, include: REQUEST_INCLUDE });
    if (!request) throw ApiError.notFound('Leave request not found');
    const next = transition(request, 'cancel');
    const res = await tx.leaveRequest.updateMany({ where: { id, status: request.status, approvalStage: request.approvalStage }, data: next });
    if (res.count !== 1) throw ApiError.conflict('This request was already actioned. Refresh to see the latest state.');
    const approverId = approverIdFor(request);
    await recordEvent(tx, {
      request, actor: user, action: 'CANCELLED',
      audit: { action: 'CANCELLED', oldValue: snapshot(request), newValue: snapshot(next) },
      notify: [{ userId: approverId, title: 'Leave request cancelled', message: `${user.name} cancelled their leave request.`, type: 'LEAVE_CANCELLED' }],
    });
    return toDto({ ...request, ...next });
  });
}

async function addDocuments(user, id, files) {
  if (!files?.length) throw ApiError.badRequest('Attach at least one file (field "documents")');
  const request = await loadVisibleRequest(user, id);
  if (request.employeeId !== user.id) throw ApiError.forbidden('Only the requester can add documents');
  if (!OPEN_STATUSES.includes(request.status)) throw ApiError.conflict(`Cannot add documents to a ${request.status} request`);
  const staged = await documentService.stage(files, user.id);
  try {
    await prisma.$transaction(async (tx) => {
      await tx.leaveDocument.createMany({ data: staged.rows.map((r) => ({ ...r, leaveRequestId: id })) });
      for (const r of staged.rows) await writeAudit(tx, { actorId: user.id, entityId: id, action: 'DOCUMENT_UPLOADED', metadata: { originalName: r.originalName, fileSize: r.fileSize } });
    });
  } catch (e) { await staged.rollback(); throw e; }
  return { uploaded: staged.rows.length };
}

async function getDocument(user, id, docId) {
  await loadVisibleRequest(user, id); // same scope rules as viewing the request
  const doc = await prisma.leaveDocument.findFirst({ where: { id: docId, leaveRequestId: id } });
  if (!doc) throw ApiError.notFound('Document not found');
  return { doc, buffer: await documentService.read(doc.storageKey) };
}

async function audit(user, id) {
  await loadVisibleRequest(user, id);
  const rows = await prisma.auditLog.findMany({ where: { entityType: 'LeaveRequest', entityId: id }, orderBy: { createdAt: 'asc' } });
  return attachActors(rows);
}

export async function attachActors(rows) {
  const ids = [...new Set(rows.map((r) => r.actorId).filter(Boolean))];
  const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, role: true } });
  const byId = Object.fromEntries(users.map((u) => [u.id, u]));
  return rows.map((r) => ({ ...r, actor: byId[r.actorId] ?? null }));
}

export const leaveService = { preview, create, list, get, decide, respond, cancel, addDocuments, getDocument, audit };
