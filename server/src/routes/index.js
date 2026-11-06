import { Router } from 'express';
import { leaveController as L } from '../controllers/leave.controller.js';
import { insightsController as I } from '../controllers/insights.controller.js';
import { authController as A } from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { authLimiter } from '../middlewares/rateLimit.js';
import { uploadDocuments } from '../middlewares/upload.js';
import { idParam, docParams, pageQuery } from '../validators/common.js';
import { loginSchema } from '../validators/auth.validator.js';
import * as V from '../validators/leave.validator.js';

const r = Router();

// ---- auth (public: login/logout) ----
r.post('/auth/login', authLimiter, validate({ body: loginSchema }), A.login);
r.post('/auth/logout', A.logout);

// ---- everything below requires a valid session ----
r.use(authenticate);
r.get('/auth/me', A.me);

// leaves. '/preview' must be declared before '/:id'.
r.get('/leaves/preview', validate({ query: V.previewQuery }), L.preview);
r.get('/leaves', validate({ query: V.listLeavesQuery }), L.list);
r.post('/leaves', authorize('EMPLOYEE', 'MANAGER'), uploadDocuments, validate({ body: V.createLeaveSchema }), L.create);
r.get('/leaves/:id', validate({ params: idParam }), L.get);
r.get('/leaves/:id/audit', validate({ params: idParam }), L.audit);
r.get('/leaves/:id/documents/:docId', validate({ params: docParams }), L.download);
r.post('/leaves/:id/documents', uploadDocuments, validate({ params: idParam }), L.addDocuments);
r.post('/leaves/:id/respond', uploadDocuments, validate({ params: idParam, body: V.respondSchema }), L.respond);
r.post('/leaves/:id/cancel', validate({ params: idParam }), L.cancel);

// approval actions: role gate here, "is this MY request to approve" check inside the service
const approver = authorize('MANAGER', 'HOD');
r.post('/leaves/:id/approve', approver, validate({ params: idParam, body: V.decisionSchema }), L.approve);
r.post('/leaves/:id/reject', approver, validate({ params: idParam, body: V.strictCommentSchema }), L.reject);
r.post('/leaves/:id/request-info', approver, validate({ params: idParam, body: V.strictCommentSchema }), L.requestInfo);

// dashboards & analytics
r.get('/dashboard/employee', authorize('EMPLOYEE', 'MANAGER'), I.dashboard('employee'));
r.get('/dashboard/manager', authorize('MANAGER'), I.dashboard('manager'));
r.get('/dashboard/hod', authorize('HOD'), I.dashboard('hod'));
r.get('/analytics/leave-trends', I.trends);
r.get('/analytics/approval-workload', approver, I.workload);

r.get('/calendar/team', validate({ query: V.calendarQuery }), I.calendar);
r.get('/audit', approver, validate({ query: pageQuery }), I.auditFeed);

r.get('/notifications', I.notifications);
r.patch('/notifications/read-all', I.markAllRead); // before '/:id'
r.patch('/notifications/:id/read', validate({ params: idParam }), I.markRead);

export default r;
