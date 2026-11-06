import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { countDays } from '../src/domain/leaveDuration.js';

const prisma = new PrismaClient();
const iso = (offsetDays) => new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);
const d = (s) => new Date(`${s}T00:00:00Z`);
const days = (a, b) => countDays(d(a), d(b));
const isWeekend = (s) => [0, 6].includes(d(s).getUTCDay());
// Starts on the first weekday at or after the offset and spans the same number of working days as the scenario's offsets.
function workingRange(a, b) {
  while (isWeekend(iso(a))) { a += 1; b += 1; }
  let end = a;
  for (let left = b - a; left > 0;) { end += 1; if (!isWeekend(iso(end))) left -= 1; }
  return [iso(a), iso(end)];
}
const DEMO_PASSWORD = 'Password@123';

// Idempotent: wipes workflow data and recreates the demo organisation. Audit rows are append-only (DB trigger),
// so they are not deleted: they stay as history and new events are simply added.
async function main() {
  await prisma.notification.deleteMany();
  await prisma.leaveDocument.deleteMany();
  await prisma.approvalAction.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.leavePolicy.deleteMany();
  await prisma.leavePolicy.create({ data: {} });

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const dept = await prisma.department.upsert({ where: { name: 'Engineering' }, update: {}, create: { name: 'Engineering' } });
  const person = (email, name, role, managerId = null) =>
    prisma.user.upsert({ where: { email }, update: { name, role, managerId, departmentId: dept.id, passwordHash }, create: { email, name, role, managerId, departmentId: dept.id, passwordHash } });

  const hod = await person('hod@leaveflow.dev', 'Harish Oberoi', 'HOD');
  await prisma.department.update({ where: { id: dept.id }, data: { hodId: hod.id } });
  const manager = await person('manager@leaveflow.dev', 'Meera Menon', 'MANAGER', hod.id);
  const emp = await person('employee@leaveflow.dev', 'Esha Rao', 'EMPLOYEE', manager.id);
  const arjun = await person('arjun@leaveflow.dev', 'Arjun Patel', 'EMPLOYEE', manager.id);
  const nisha = await person('nisha@leaveflow.dev', 'Nisha Kapoor', 'EMPLOYEE', manager.id);

  // [employee, from, to, status, stage, reason, history[]]  history = [actor, role, action, stage, comment, minutesAgo]
  const scenarios = [
    [emp, 6, 7, 'PENDING_MANAGER', 'MANAGER', 'Family function', []],
    [arjun, 10, 14, 'PENDING_MANAGER', 'MANAGER', 'Sibling wedding out of town', []],
    [nisha, 20, 24, 'PENDING_HOD', 'HOD', 'Medical procedure and recovery', [[manager, 'MANAGER', 'APPROVED', 'MANAGER', 'Documents look fine.', 300]]],
    [emp, 30, 34, 'NEEDS_INFO', 'MANAGER', 'Travel for a conference', [[manager, 'MANAGER', 'INFO_REQUESTED', 'MANAGER', 'Please share the conference invitation.', 120]]],
    [arjun, 2, 3, 'APPROVED', 'NONE', 'Personal errand', [[manager, 'MANAGER', 'APPROVED', 'MANAGER', 'Approved.', 2000]]],
    [nisha, -20, -18, 'REJECTED', 'NONE', 'Short break', [[manager, 'MANAGER', 'REJECTED', 'MANAGER', 'Release week, team is short-staffed.', 5000]]],
    [emp, 45, 50, 'APPROVED', 'NONE', 'Annual vacation', [[manager, 'MANAGER', 'APPROVED', 'MANAGER', 'Enjoy!', 4000], [hod, 'HOD', 'APPROVED', 'HOD', 'Approved.', 3900]]],
  ];

  for (const [e, a, b, status, stage, reason, history] of scenarios) {
    const [from, to] = workingRange(a, b); const n = days(from, to);
    const r = await prisma.leaveRequest.create({ data: { employeeId: e.id, fromDate: d(from), toDate: d(to), reason, daysCount: n, requiresHodApproval: n > 3, status, approvalStage: stage, createdAt: new Date(Date.now() - 6 * 3600_000) } });
    const log = (actor, role, action, st, comment, ago) => Promise.all([
      prisma.approvalAction.create({ data: { leaveRequestId: r.id, actorId: actor.id, actorRole: role, action, stage: st, comment, createdAt: new Date(Date.now() - ago * 60_000) } }),
      prisma.auditLog.create({ data: { actorId: actor.id, entityType: 'LeaveRequest', entityId: r.id, action, metadata: { stage: st, comment }, createdAt: new Date(Date.now() - ago * 60_000) } }),
    ]);
    await log(e, 'EMPLOYEE', 'SUBMITTED', 'MANAGER', reason, 6000);
    for (const h of history) await log(...h);
    if (n > 3) await prisma.notification.create({ data: { userId: manager.id, title: 'New leave request', message: `${e.name} requested ${n} days of leave.`, type: 'LEAVE_SUBMITTED', relatedEntityId: r.id } });
    if (status === 'NEEDS_INFO') await prisma.notification.create({ data: { userId: e.id, title: 'More information requested', message: 'Meera Menon needs more information on your leave: Please share the conference invitation.', type: 'INFO_REQUESTED', relatedEntityId: r.id } });
    if (status === 'PENDING_HOD') await prisma.notification.create({ data: { userId: hod.id, title: 'HOD approval required', message: `${e.name}'s leave was approved by their manager and needs your decision.`, type: 'HOD_APPROVAL_REQUIRED', relatedEntityId: r.id } });
    if (status === 'APPROVED') await prisma.notification.create({ data: { userId: e.id, title: 'Leave approved', message: 'Your leave was approved.', type: 'FINAL_DECISION', relatedEntityId: r.id, isRead: true } });
  }
  console.log(`Seeded Engineering department, 5 users (password ${DEMO_PASSWORD}) and ${scenarios.length} leave requests.`);
}
main().finally(() => prisma.$disconnect());
