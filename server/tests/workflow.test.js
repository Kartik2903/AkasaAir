import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import { app } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';

const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF');
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const PW = 'Password@123';
const ag = {}; // logged-in supertest agents by key
const u = {};  // users by key


async function login(key) {
  const a = request.agent(app);
  const r = await a.post('/api/auth/login').send({ email: u[key].email, password: PW });
  expect(r.status).toBe(200);
  ag[key] = a;
}
// Each call uses its own date window so tests never collide on the overlap rule.
let cursor = 0;
const window = (nDays) => {
  // Starts on a Monday (2032-01-05) and spans nDays calendar days; nDays must stay within Mon-Fri.
  if (nDays > 5) throw new Error('window() supports up to 5 days');
  const start = new Date(Date.UTC(2032, 0, 5 + cursor)); cursor += 7;
  const end = new Date(start.getTime() + (nDays - 1) * 86_400_000);
  return { fromDate: start.toISOString().slice(0, 10), toDate: end.toISOString().slice(0, 10) };
};
const submit = (key, nDays, { file = true, reason = 'Family commitment' } = {}) => {
  const w = window(nDays);
  let req = ag[key].post('/api/leaves').field('fromDate', w.fromDate).field('toDate', w.toDate).field('reason', reason);
  if (file) req = req.attach('documents', PDF, { filename: 'note.pdf', contentType: 'application/pdf' });
  return req;
};
const act = (key, id, action, comment) => ag[key].post(`/api/leaves/${id}/${action}`).send(comment ? { comment } : {});
const detail = async (key, id) => (await ag[key].get(`/api/leaves/${id}`)).body.data;

beforeAll(async () => {
  await prisma.$executeRawUnsafe('TRUNCATE "Notification","LeaveDocument","ApprovalAction","LeaveRequest","LeavePolicy","AuditLog","User","Department" RESTART IDENTITY CASCADE');
  await prisma.leavePolicy.create({ data: {} });
  const passwordHash = await bcrypt.hash(PW, 4);
  const eng = await prisma.department.create({ data: { name: 'Engineering' } });
  const ops = await prisma.department.create({ data: { name: 'Operations' } });
  const mk = async (key, role, departmentId, managerId = null) =>
    (u[key] = await prisma.user.create({ data: { name: key, email: `${key.toLowerCase()}@t.io`, role, departmentId, managerId, passwordHash } }));
  await mk('hod', 'HOD', eng.id); await prisma.department.update({ where: { id: eng.id }, data: { hodId: u.hod.id } });
  await mk('mgr', 'MANAGER', eng.id, u.hod.id);
  await mk('emp', 'EMPLOYEE', eng.id, u.mgr.id);
  await mk('emp2', 'EMPLOYEE', eng.id, u.mgr.id);
  await mk('hod2', 'HOD', ops.id); await prisma.department.update({ where: { id: ops.id }, data: { hodId: u.hod2.id } });
  await mk('mgr2', 'MANAGER', ops.id, u.hod2.id);
  await mk('outsider', 'EMPLOYEE', ops.id, u.mgr2.id);
  // a second manager inside Engineering with their own report: same department, different team
  await mk('mgrB', 'MANAGER', eng.id, u.hod.id);
  await mk('empB', 'EMPLOYEE', eng.id, u.mgrB.id);
  for (const k of Object.keys(u)) await login(k);
});
afterAll(async () => { fs.rmSync('uploads-test', { recursive: true, force: true }); await prisma.$disconnect(); });

describe('submission rules', () => {
  it('1-2. two and three day leave need no document and go to manager only', async () => {
    for (const n of [2, 3]) {
      const r = await submit('emp', n, { file: false });
      expect(r.status).toBe(201);
      expect(r.body.data).toMatchObject({ daysCount: n, requiresHodApproval: false, status: 'PENDING_MANAGER', approvalStage: 'MANAGER' });
    }
  });
  it('3. four day leave without a document is rejected, with a document it requires HOD approval', async () => {
    const bad = await submit('emp', 4, { file: false });
    expect(bad.status).toBe(400);
    expect(bad.body.errors[0].field).toBe('documents');
    const good = await submit('emp', 4);
    expect(good.status).toBe(201);
    expect(good.body.data).toMatchObject({ daysCount: 4, requiresHodApproval: true });
  });
  it('rejects end before start and files that are not really PDF/PNG/JPG', async () => {
    const r = await ag.emp.post('/api/leaves').field('fromDate', '2040-01-10').field('toDate', '2040-01-09').field('reason', 'Backwards dates');
    expect(r.status).toBe(400);
    const fake = await ag.emp.post('/api/leaves').field('fromDate', '2040-02-01').field('toDate', '2040-02-06').field('reason', 'Fake document')
      .attach('documents', Buffer.from('MZ not a pdf'), { filename: 'evil.pdf', contentType: 'application/pdf' });
    expect(fake.status).toBe(400);
  });
  it('rejects files over 5 MB', async () => {
    const big = Buffer.concat([PDF, Buffer.alloc(5 * 1024 * 1024)]);
    const r = await ag.emp.post('/api/leaves').field('fromDate', '2040-03-01').field('toDate', '2040-03-06').field('reason', 'Big document')
      .attach('documents', big, { filename: 'big.pdf', contentType: 'application/pdf' });
    expect(r.status).toBe(400);
  });
  it('15. overlapping requests are rejected (also in preview), non-overlapping adjacent ones are fine', async () => {
    const first = await submit('emp2', 2, { file: false });
    const { fromDate, toDate } = first.body.data;
    const dup = await ag.emp2.post('/api/leaves').field('fromDate', fromDate).field('toDate', toDate).field('reason', 'Same days again');
    expect(dup.status).toBe(409);
    const prev = await ag.emp2.get('/api/leaves/preview').query({ fromDate, toDate });
    expect(prev.body.data.overlap).toBeTruthy(); expect(prev.body.data.valid).toBe(false);
    const next = new Date(new Date(`${toDate}T00:00:00Z`).getTime() + 86_400_000).toISOString().slice(0, 10);
    expect((await ag.emp2.post('/api/leaves').field('fromDate', next).field('toDate', next).field('reason', 'Day after')).status).toBe(201);
  });
  it('preview mirrors submit rules', async () => {
    const r = await ag.emp.get('/api/leaves/preview').query({ fromDate: '2045-01-02', toDate: '2045-01-05' });
    expect(r.body.data).toMatchObject({ days: 4, requiresDocument: true, requiresHodApproval: true, valid: true });
    expect(r.body.data.messages.join(' ')).toMatch(/manager and HOD/);
  });
  it('weekends do not count: Fri-Tue is 3 days, manager only, no document', async () => {
    const r = await ag.emp.get('/api/leaves/preview').query({ fromDate: '2045-01-06', toDate: '2045-01-10' });
    expect(r.body.data).toMatchObject({ days: 3, requiresDocument: false, requiresHodApproval: false, valid: true });
  });
  it('a weekend-only request is refused', async () => {
    const q = { fromDate: '2045-01-07', toDate: '2045-01-08' };
    expect((await ag.emp.get('/api/leaves/preview').query(q)).body.data.valid).toBe(false);
    expect((await ag.emp.post('/api/leaves').field(q).field('reason', 'Weekend only')).status).toBe(400);
  });
  it('past dates and over-long ranges are refused by the API, not just the form', async () => {
    const past = { fromDate: '2020-01-06', toDate: '2020-01-07' };
    expect((await ag.emp.post('/api/leaves').field(past).field('reason', 'In the past')).status).toBe(400);
    expect((await ag.emp.get('/api/leaves/preview').query(past)).body.data.valid).toBe(false);
    const long = await ag.emp.post('/api/leaves').field({ fromDate: '2050-01-03', toDate: '2052-01-03' }).field('reason', 'Far too long').attach('documents', PDF, { filename: 'a.pdf', contentType: 'application/pdf' });
    expect(long.status).toBe(400);
  });
  it('malformed input gets a 400, never a 500', async () => {
    const id = (await submit('emp', 1, { file: false })).body.data.id;
    const cases = [
      await ag.emp.post('/api/leaves').field({ fromDate: '2050-02-30', toDate: '2050-03-01' }).field('reason', 'Impossible date'),
      await ag.emp.post('/api/leaves').field({ fromDate: '2050-01-03', toDate: '2050-01-03' }).field('reason', '     '),
      await ag.emp.post('/api/leaves').field({ fromDate: '2050-01-03', toDate: '2050-01-03' }).field('reason', 'x'.repeat(501)),
      await ag.emp.post('/api/leaves').field({ fromDate: 'tomorrow', toDate: '2050-01-03' }).field('reason', 'Bad format'),
      await ag.emp.get('/api/leaves').query({ from: '2050-02-30' }),
      await ag.emp.get('/api/leaves').query({ status: 'NOPE' }),
      await ag.emp.get('/api/leaves').query({ limit: 1000 }),
      await ag.emp.get('/api/leaves/not-a-uuid'),
      await ag.emp.get('/api/calendar/team').query({ month: '2050-13' }),
      await ag.emp.post(`/api/leaves/${id}/documents`),
      await request(app).post('/api/auth/login').set('content-type', 'application/json').send('{bad json'),
      await request(app).post('/api/auth/login').send({ email: 'nope', password: 'x' }),
    ];
    expect(cases.map((r) => r.status)).toEqual(cases.map(() => 400));
  });
  it('HOD cannot apply for leave', async () => expect((await submit('hod', 2, { file: false })).status).toBe(403));
});

describe('workflow: short leave', () => {
  it('manager approval completes it, with audit + notification', async () => {
    const id = (await submit('emp', 2, { file: false })).body.data.id;
    const r = await act('mgr', id, 'approve');
    expect(r.body.data).toMatchObject({ status: 'APPROVED', approvalStage: 'NONE' });
    const audit = (await ag.emp.get(`/api/leaves/${id}/audit`)).body.data.map((a) => a.action);
    expect(audit).toEqual(['SUBMITTED', 'APPROVED']);
    expect((await prisma.notification.findMany({ where: { userId: u.emp.id, relatedEntityId: id } })).length).toBe(1);
  });
});

describe('workflow: four day leave lifecycle (acceptance test)', () => {
  it('submit -> manager approve -> HOD info request -> respond -> HOD approve', async () => {
    const id = (await submit('emp', 4)).body.data.id;
    expect(await detail('mgr', id)).toMatchObject({ status: 'PENDING_MANAGER' });

    // 4. manager approves -> HOD
    expect((await act('mgr', id, 'approve', 'Looks fine')).body.data).toMatchObject({ status: 'PENDING_HOD', approvalStage: 'HOD' });
    expect(await prisma.notification.count({ where: { userId: u.hod.id, relatedEntityId: id, type: 'HOD_APPROVAL_REQUIRED' } })).toBe(1);

    // 9. HOD requests info: NEEDS_INFO but still at the HOD stage; comment is mandatory
    expect((await act('hod', id, 'request-info')).status).toBe(400);
    const info = await act('hod', id, 'request-info', 'Please attach the hospital letter');
    expect(info.body.data).toMatchObject({ status: 'NEEDS_INFO', approvalStage: 'HOD' });

    // approvers cannot decide while waiting for the employee (16)
    expect((await act('hod', id, 'approve')).status).toBe(409);

    // 10. employee responds with a new document -> back to PENDING_HOD, manager does NOT re-approve
    const resp = await ag.emp.post(`/api/leaves/${id}/respond`).field('comment', 'Letter attached').attach('documents', PNG, { filename: 'letter.png', contentType: 'image/png' });
    expect(resp.body.data).toMatchObject({ status: 'PENDING_HOD', approvalStage: 'HOD' });
    expect((await act('mgr', id, 'approve')).status).toBe(403); // manager cannot bypass the HOD stage

    // 6. HOD approves -> final
    expect((await act('hod', id, 'approve')).body.data).toMatchObject({ status: 'APPROVED', approvalStage: 'NONE' });

    const d = await detail('emp', id);
    expect(d.documents.length).toBe(2);
    expect(d.timeline.map((t) => t.action)).toEqual(['SUBMITTED', 'APPROVED', 'INFO_REQUESTED', 'EMPLOYEE_RESPONSE', 'APPROVED']);
    expect(d.stages.map((s) => s.state)).toEqual(['done', 'done']);
    // 18. audit has every important step incl. document uploads
    const audit = (await ag.emp.get(`/api/leaves/${id}/audit`)).body.data.map((a) => a.action);
    expect(audit).toEqual(['SUBMITTED', 'DOCUMENT_UPLOADED', 'APPROVED', 'INFO_REQUESTED', 'EMPLOYEE_RESPONSE', 'DOCUMENT_UPLOADED', 'APPROVED']);
    // 19. notifications for the employee
    const types = (await prisma.notification.findMany({ where: { userId: u.emp.id, relatedEntityId: id } })).map((n) => n.type).sort();
    expect(types).toEqual(['HOD_APPROVED', 'INFO_REQUESTED', 'MANAGER_APPROVED']);
  });

  it('5. manager rejection is final and HOD can no longer act', async () => {
    const id = (await submit('emp', 5)).body.data.id;
    expect((await act('mgr', id, 'reject')).status).toBe(400); // comment required
    expect((await act('mgr', id, 'reject', 'Not during release')).body.data).toMatchObject({ status: 'REJECTED', approvalStage: 'NONE' });
    expect((await act('hod', id, 'approve')).status).toBe(409);
  });
  it('7. HOD rejection rejects', async () => {
    const id = (await submit('emp', 5)).body.data.id;
    await act('mgr', id, 'approve');
    expect((await act('hod', id, 'reject', 'Peak season')).body.data).toMatchObject({ status: 'REJECTED' });
  });
  it('8. manager can request info and the stage stays MANAGER', async () => {
    const id = (await submit('emp', 2, { file: false })).body.data.id;
    expect((await act('mgr', id, 'request-info', 'Which dates exactly?')).body.data).toMatchObject({ status: 'NEEDS_INFO', approvalStage: 'MANAGER' });
    const r = await ag.emp.post(`/api/leaves/${id}/respond`).field('comment', 'The 14th and 15th');
    expect(r.body.data).toMatchObject({ status: 'PENDING_MANAGER', approvalStage: 'MANAGER' });
  });
  it('owner can cancel an open request but not a finished one', async () => {
    const id = (await submit('emp', 2, { file: false })).body.data.id;
    expect((await ag.emp.post(`/api/leaves/${id}/cancel`)).body.data.status).toBe('CANCELLED');
    expect((await ag.emp.post(`/api/leaves/${id}/cancel`)).status).toBe(409);
  });
});

describe('authorization and scoping', () => {
  let id;
  beforeAll(async () => { id = (await submit('emp', 2, { file: false })).body.data.id; });

  it('11. employees cannot see other employees\' requests (404) and lists are scoped', async () => {
    expect((await ag.emp2.get(`/api/leaves/${id}`)).status).toBe(404);
    expect((await ag.outsider.get(`/api/leaves/${id}`)).status).toBe(404);
    const mine = (await ag.emp2.get('/api/leaves')).body.data;
    expect(mine.every((r) => r.employeeId === u.emp2.id)).toBe(true);
    expect((await ag.emp.get('/api/leaves').query({ scope: 'team' })).status).toBe(403);
  });
  it('12. managers cannot access or act on requests outside their team', async () => {
    expect((await ag.mgrB.get(`/api/leaves/${id}`)).status).toBe(404);
    expect((await act('mgrB', id, 'approve')).status).toBe(404);
    expect((await act('mgr2', id, 'approve')).status).toBe(404);
    expect((await ag.mgrB.get('/api/leaves').query({ scope: 'team' })).body.data.every((r) => r.employee.id === u.empB.id || r.employee.id === u.mgrB.id)).toBe(true);
  });
  it('13. HODs cannot access requests outside their department', async () => {
    expect((await ag.hod2.get(`/api/leaves/${id}`)).status).toBe(404);
    expect((await act('hod2', id, 'approve')).status).toBe(404);
    expect((await ag.hod.get(`/api/leaves/${id}`)).status).toBe(200);
  });
  it('14. employees cannot approve (their own or anyone\'s) requests', async () => {
    expect((await act('emp', id, 'approve')).status).toBe(403);
    expect((await act('emp2', id, 'approve')).status).toBe(403);
  });
  it('a manager cannot approve their own leave; the HOD does, as a single stage', async () => {
    const r = await submit('mgr', 5, { file: true });
    expect(r.body.data.requiresHodApproval).toBe(false);
    expect((await act('mgr', r.body.data.id, 'approve')).status).toBe(403);
    expect((await act('hod', r.body.data.id, 'approve')).body.data.status).toBe('APPROVED');
  });
  it('HOD cannot decide a request still waiting on the manager (wrong stage)', async () => {
    expect((await act('hod', id, 'approve')).status).toBe(403);
  });
  it('requires a session', async () => expect((await request(app).get('/api/leaves')).status).toBe(401));
  it('responds only to the owner', async () => {
    expect((await ag.mgr.post(`/api/leaves/${id}/respond`).field('comment', 'hello')).status).toBe(403);
  });
});

describe('documents', () => {
  it('20. only people who can see the request may download its documents', async () => {
    const id = (await submit('emp', 4)).body.data.id;
    const doc = (await detail('emp', id)).documents[0];
    const url = `/api/leaves/${id}/documents/${doc.id}`;
    const ok = await ag.mgr.get(url);
    expect(ok.status).toBe(200); expect(ok.headers['content-type']).toMatch(/pdf/);
    expect(ok.headers['content-disposition']).toMatch(/attachment/);
    expect((await ag.hod.get(url)).status).toBe(200);
    for (const k of ['emp2', 'outsider', 'mgrB', 'mgr2', 'hod2']) expect((await ag[k].get(url)).status).toBe(404);
    expect((await request(app).get(url)).status).toBe(401);
    expect(JSON.stringify(await detail('emp', id))).not.toMatch(/storageKey/);
  });
});

describe('concurrency and integrity', () => {
  it('17. simultaneous approvals produce exactly one success and consistent history', async () => {
    const id = (await submit('emp', 2, { file: false })).body.data.id;
    const results = await Promise.all([act('mgr', id, 'approve'), act('mgr', id, 'approve'), act('mgr', id, 'approve')]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409, 409]);
    expect(await prisma.approvalAction.count({ where: { leaveRequestId: id, action: 'APPROVED' } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { entityId: id, action: 'APPROVED' } })).toBe(1);
  });
  it('17b. a manager approve racing a cancel never ends in two outcomes', async () => {
    const id = (await submit('emp', 2, { file: false })).body.data.id;
    const [a, c] = await Promise.all([act('mgr', id, 'approve'), ag.emp.post(`/api/leaves/${id}/cancel`)]);
    expect([a.status, c.status].sort()).toEqual([200, 409]);
    expect(['APPROVED', 'CANCELLED']).toContain((await detail('emp', id)).status);
  });
  it('audit history is append-only at the database level', async () => {
    await expect(prisma.auditLog.updateMany({ data: { action: 'HACKED' } })).rejects.toThrow(/append-only/);
    await expect(prisma.auditLog.deleteMany({})).rejects.toThrow(/append-only/);
  });
  it('rejects malformed ids and unknown routes with the error envelope', async () => {
    const r = await ag.emp.get('/api/leaves/not-a-uuid');
    expect(r.status).toBe(400); expect(r.body.success).toBe(false);
    expect((await ag.emp.get('/api/nope')).status).toBe(404);
  });
});

describe('dashboards, analytics, calendar, notifications', () => {
  it('serve role-scoped, persisted data', async () => {
    expect((await ag.emp.get('/api/dashboard/employee')).body.data.total).toBeGreaterThan(0);
    expect((await ag.emp.get('/api/dashboard/manager')).status).toBe(403);
    const m = (await ag.mgr.get('/api/dashboard/manager')).body.data;
    expect(m).toHaveProperty('pendingApprovals'); expect(m.workload.decidedLast30Days).toBeGreaterThan(0);
    expect((await ag.hod.get('/api/dashboard/hod')).status).toBe(200);
    expect((await ag.emp.get('/api/analytics/approval-workload')).status).toBe(403);
    const trends = (await ag.hod.get('/api/analytics/leave-trends')).body.data;
    expect(trends.trend).toHaveLength(6); expect(trends.byStatus.length).toBeGreaterThan(0);
  });
  it('calendar shows team leave without reasons and hides colleagues\' pending leave from employees', async () => {
    const w = window(2);
    await ag.emp.post('/api/leaves').field('fromDate', w.fromDate).field('toDate', w.toDate).field('reason', 'Private medical matter');
    const month = w.fromDate.slice(0, 7);
    const asMgr = (await ag.mgr.get('/api/calendar/team').query({ month })).body.data;
    expect(asMgr.entries.some((e) => e.employeeId === u.emp.id)).toBe(true);
    expect(JSON.stringify(asMgr)).not.toMatch(/Private medical/);
    const asColleague = (await ag.emp2.get('/api/calendar/team').query({ month })).body.data;
    expect(asColleague.entries.some((e) => e.employeeId === u.emp.id && e.status === 'PENDING')).toBe(false);
    expect((await ag.outsider.get('/api/calendar/team').query({ month })).body.data.entries.some((e) => e.employeeId === u.emp.id)).toBe(false);
  });
  it('notifications list, mark read and mark all read (own only)', async () => {
    const list = await ag.mgr.get('/api/notifications');
    expect(list.body.meta.unread).toBeGreaterThan(0);
    const first = list.body.data[0];
    expect((await ag.emp.patch(`/api/notifications/${first.id}/read`)).status).toBe(404); // someone else's
    expect((await ag.mgr.patch(`/api/notifications/${first.id}/read`)).status).toBe(200);
    await ag.mgr.patch('/api/notifications/read-all');
    expect((await ag.mgr.get('/api/notifications')).body.meta.unread).toBe(0);
  });
  it('audit feed is limited to manager/HOD and to requests in scope', async () => {
    expect((await ag.emp.get('/api/audit')).status).toBe(403);
    const feed = (await ag.mgrB.get('/api/audit')).body.data;
    expect(feed.every((a) => a.employeeName !== 'emp')).toBe(true);
  });
  it('search and filter the manager list', async () => {
    const r = await ag.mgr.get('/api/leaves').query({ scope: 'team', search: 'emp2', status: 'PENDING_MANAGER' });
    expect(r.body.data.every((x) => x.employee.name === 'emp2')).toBe(true);
    expect(r.body.meta).toHaveProperty('totalPages');
  });
});
