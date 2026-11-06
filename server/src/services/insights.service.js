import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { formatDate, todayUtc, parseDate } from '../domain/leaveDuration.js';
import { visibleWhere, approverWhere } from './access.service.js';
import { attachActors } from './leave.service.js';
import { toSkipTake, buildMeta } from '../utils/pagination.js';

const countBy = (rows, key) => rows.reduce((m, r) => ({ ...m, [r[key]]: (m[r[key]] ?? 0) + 1 }), {});
const monthKey = (d) => formatDate(d).slice(0, 7);
const lastMonths = (n) => {
  const now = new Date(); const out = [];
  for (let i = n - 1; i >= 0; i--) out.push(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)).toISOString().slice(0, 7));
  return out;
};
const brief = (r) => ({ id: r.id, employeeName: r.employee?.name, fromDate: formatDate(r.fromDate), toDate: formatDate(r.toDate), daysCount: r.daysCount, status: r.status });
const EMP = { employee: { select: { name: true } } };

// ---------- dashboards ----------
async function employeeDashboard(user) {
  const today = todayUtc();
  const [all, upcoming, recent] = await Promise.all([
    prisma.leaveRequest.findMany({ where: { employeeId: user.id }, select: { status: true } }),
    prisma.leaveRequest.findMany({ where: { employeeId: user.id, status: 'APPROVED', toDate: { gte: today } }, orderBy: { fromDate: 'asc' }, take: 5, include: EMP }),
    prisma.approvalAction.findMany({ where: { leaveRequest: { employeeId: user.id } }, orderBy: { createdAt: 'desc' }, take: 6, include: { actor: { select: { name: true } }, leaveRequest: { select: { id: true, fromDate: true, toDate: true } } } }),
  ]);
  const c = countBy(all, 'status');
  return {
    total: all.length, approved: c.APPROVED ?? 0, rejected: c.REJECTED ?? 0,
    pending: (c.PENDING_MANAGER ?? 0) + (c.PENDING_HOD ?? 0), needsInfo: c.NEEDS_INFO ?? 0,
    upcoming: upcoming.map(brief),
    recentActivity: recent.map((a) => ({ id: a.id, action: a.action, actorName: a.actor.name, requestId: a.leaveRequest.id, fromDate: formatDate(a.leaveRequest.fromDate), toDate: formatDate(a.leaveRequest.toDate), createdAt: a.createdAt })),
  };
}

async function approverDashboard(user) {
  const today = todayUtc();
  const scope = visibleWhere(user);
  const [pending, requests, onLeave, upcoming, decisions, decidedMonth] = await Promise.all([
    prisma.leaveRequest.count({ where: { AND: [approverWhere(user), { status: { in: ['PENDING_MANAGER', 'PENDING_HOD'] } }] } }),
    prisma.leaveRequest.findMany({ where: { AND: [scope, { employeeId: { not: user.id } }] }, select: { status: true } }),
    prisma.leaveRequest.findMany({ where: { AND: [scope, { employeeId: { not: user.id } }, { status: 'APPROVED', fromDate: { lte: today }, toDate: { gte: today } }] }, include: EMP }),
    prisma.leaveRequest.findMany({ where: { AND: [scope, { employeeId: { not: user.id } }, { status: 'APPROVED', fromDate: { gt: today } }] }, orderBy: { fromDate: 'asc' }, take: 5, include: EMP }),
    prisma.approvalAction.findMany({ where: { actorId: user.id, action: { in: ['APPROVED', 'REJECTED', 'INFO_REQUESTED'] } }, orderBy: { createdAt: 'desc' }, take: 5, include: { leaveRequest: { include: EMP } } }),
    prisma.approvalAction.count({ where: { actorId: user.id, action: { in: ['APPROVED', 'REJECTED'] }, createdAt: { gte: new Date(Date.now() - 30 * 86_400_000) } } }),
  ]);
  const c = countBy(requests, 'status');
  return {
    pendingApprovals: pending, awaitingInfo: c.NEEDS_INFO ?? 0, approved: c.APPROVED ?? 0, rejected: c.REJECTED ?? 0,
    onLeaveNow: onLeave.map(brief), upcoming: upcoming.map(brief),
    workload: { pending, decidedLast30Days: decidedMonth },
    recentDecisions: decisions.map((a) => ({ id: a.id, action: a.action, requestId: a.leaveRequestId, employeeName: a.leaveRequest.employee.name, createdAt: a.createdAt })),
  };
}

async function dashboard(user, role) {
  if (role === 'employee') return employeeDashboard(user);
  if ((role === 'manager' && user.role !== 'MANAGER') || (role === 'hod' && user.role !== 'HOD')) throw ApiError.forbidden('Insufficient permissions');
  return approverDashboard(user);
}

// ---------- analytics ----------
async function leaveTrends(user) {
  const months = lastMonths(6);
  const start = parseDate(`${months[0]}-01`);
  const rows = await prisma.leaveRequest.findMany({ where: { AND: [visibleWhere(user), { fromDate: { gte: start } }] }, include: EMP });
  const trend = months.map((month) => {
    const inMonth = rows.filter((r) => monthKey(r.fromDate) === month);
    return { month, requests: inMonth.length, approvedDays: inMonth.filter((r) => r.status === 'APPROVED').reduce((s, r) => s + r.daysCount, 0) };
  });
  const allScoped = await prisma.leaveRequest.findMany({ where: visibleWhere(user), select: { status: true, daysCount: true, employee: { select: { name: true } } } });
  const status = countBy(allScoped, 'status');
  const perPerson = {};
  for (const r of allScoped) if (r.status === 'APPROVED') perPerson[r.employee.name] = (perPerson[r.employee.name] ?? 0) + r.daysCount;
  return {
    trend,
    byStatus: Object.entries(status).map(([name, value]) => ({ name, value })),
    byEmployee: Object.entries(perPerson).map(([name, days]) => ({ name, days })).sort((a, b) => b.days - a.days).slice(0, 8),
  };
}

async function approvalWorkload(user) {
  if (user.role === 'EMPLOYEE') throw ApiError.forbidden('Insufficient permissions');
  const months = lastMonths(6);
  const start = parseDate(`${months[0]}-01`);
  const [actions, pending, awaiting] = await Promise.all([
    prisma.approvalAction.findMany({ where: { actorId: user.id, action: { in: ['APPROVED', 'REJECTED', 'INFO_REQUESTED'] }, createdAt: { gte: start } }, select: { action: true, createdAt: true } }),
    prisma.leaveRequest.count({ where: { AND: [approverWhere(user), { status: { in: ['PENDING_MANAGER', 'PENDING_HOD'] } }] } }),
    prisma.leaveRequest.count({ where: { AND: [approverWhere(user), { status: 'NEEDS_INFO' }] } }),
  ]);
  return {
    pendingNow: pending, awaitingInfo: awaiting,
    byMonth: months.map((month) => {
      const m = actions.filter((a) => monthKey(a.createdAt) === month);
      return { month, approved: m.filter((a) => a.action === 'APPROVED').length, rejected: m.filter((a) => a.action === 'REJECTED').length, infoRequested: m.filter((a) => a.action === 'INFO_REQUESTED').length };
    }),
  };
}

// ---------- calendar (no reasons, no documents) ----------
async function calendar(user, { month, employeeId }) {
  const m = month ?? formatDate(todayUtc()).slice(0, 7);
  const start = parseDate(`${m}-01`);
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));

  // Whose leave is relevant: employee -> same manager's team, manager -> their reports, HOD -> department.
  const people = user.role === 'HOD' ? { departmentId: user.departmentId }
    : user.role === 'MANAGER' ? { OR: [{ managerId: user.id }, { id: user.id }] }
    : { OR: [{ managerId: user.managerId ?? undefined }, { id: user.id }] };
  const team = await prisma.user.findMany({ where: people, select: { id: true, name: true, role: true } });
  const ids = employeeId ? team.filter((t) => t.id === employeeId).map((t) => t.id) : team.map((t) => t.id);

  const rows = await prisma.leaveRequest.findMany({
    where: { employeeId: { in: ids }, status: { in: ['APPROVED', 'PENDING_MANAGER', 'PENDING_HOD', 'NEEDS_INFO'] }, fromDate: { lte: end }, toDate: { gte: start } },
    include: EMP, orderBy: { fromDate: 'asc' },
  });
  // Employees only see colleagues' APPROVED leave; their own and (for approvers) everyone's pending leave is shown as pending.
  const visible = rows.filter((r) => r.status === 'APPROVED' || r.employeeId === user.id || user.role !== 'EMPLOYEE');
  return {
    month: m, team: team.map(({ id, name }) => ({ id, name })),
    entries: visible.map((r) => ({ id: r.id, employeeId: r.employeeId, employeeName: r.employee.name, fromDate: formatDate(r.fromDate), toDate: formatDate(r.toDate), daysCount: r.daysCount, status: r.status === 'APPROVED' ? 'APPROVED' : 'PENDING', own: r.employeeId === user.id })),
  };
}

// ---------- notifications ----------
const notificationService = {
  async list(user) {
    const [items, unread] = await Promise.all([
      prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 50 }),
      prisma.notification.count({ where: { userId: user.id, isRead: false } }),
    ]);
    return { items, unread };
  },
  async markRead(user, id) {
    const r = await prisma.notification.updateMany({ where: { id, userId: user.id }, data: { isRead: true } });
    if (r.count === 0) throw ApiError.notFound('Notification not found');
  },
  markAllRead: (user) => prisma.notification.updateMany({ where: { userId: user.id, isRead: false }, data: { isRead: true } }),
};

// ---------- audit viewer (manager/HOD, scoped to requests they may see) ----------
async function auditFeed(user, q) {
  if (user.role === 'EMPLOYEE') throw ApiError.forbidden('Insufficient permissions');
  const ids = (await prisma.leaveRequest.findMany({ where: visibleWhere(user), select: { id: true } })).map((r) => r.id);
  const where = { entityType: 'LeaveRequest', entityId: { in: ids } };
  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, ...toSkipTake(q) }),
    prisma.auditLog.count({ where }),
  ]);
  const withActors = await attachActors(rows);
  const reqs = await prisma.leaveRequest.findMany({ where: { id: { in: [...new Set(rows.map((r) => r.entityId))] } }, include: EMP });
  const byId = Object.fromEntries(reqs.map((r) => [r.id, r]));
  return { items: withActors.map((r) => ({ ...r, employeeName: byId[r.entityId]?.employee.name })), meta: buildMeta(total, q.page, q.limit) };
}

export const insightsService = { dashboard, leaveTrends, approvalWorkload, calendar, auditFeed };
export { notificationService };
