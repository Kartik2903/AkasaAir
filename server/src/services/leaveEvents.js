// Records everything a workflow step must leave behind, inside the caller's transaction:
// timeline entry + audit row + notifications. Keeps leave.service readable.
export async function recordEvent(tx, { request, actor, action, comment, audit, notify = [] }) {
  await tx.approvalAction.create({
    data: { leaveRequestId: request.id, actorId: actor.id, actorRole: actor.role, action, stage: request.approvalStage, comment: comment || null },
  });
  await writeAudit(tx, { actorId: actor.id, entityId: request.id, ...audit });
  await notifyUsers(tx, request.id, notify);
}

export const writeAudit = (tx, { actorId, entityId, action, oldValue, newValue, metadata }) =>
  tx.auditLog.create({ data: { actorId, entityType: 'LeaveRequest', entityId, action, oldValue, newValue, metadata } });

export const notifyUsers = (tx, relatedEntityId, notify) =>
  notify.length
    ? tx.notification.createMany({ data: notify.filter((n) => n.userId).map((n) => ({ ...n, relatedEntityId })) })
    : undefined;

export const snapshot = (r) => ({ status: r.status, approvalStage: r.approvalStage });
