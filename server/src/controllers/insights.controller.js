import { insightsService, notificationService } from '../services/insights.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/response.js';

export const insightsController = {
  dashboard: (role) => asyncHandler(async (req, res) => ok(res, await insightsService.dashboard(req.user, role), 'Dashboard retrieved successfully')),
  trends: asyncHandler(async (req, res) => ok(res, await insightsService.leaveTrends(req.user), 'Leave trends retrieved successfully')),
  workload: asyncHandler(async (req, res) => ok(res, await insightsService.approvalWorkload(req.user), 'Approval workload retrieved successfully')),
  calendar: asyncHandler(async (req, res) => ok(res, await insightsService.calendar(req.user, req.validatedQuery), 'Calendar retrieved successfully')),
  auditFeed: asyncHandler(async (req, res) => {
    const { items, meta } = await insightsService.auditFeed(req.user, req.validatedQuery);
    ok(res, items, 'Audit history retrieved successfully', meta);
  }),
  notifications: asyncHandler(async (req, res) => { const { items, unread } = await notificationService.list(req.user); ok(res, items, 'Notifications retrieved successfully', { unread }); }),
  markRead: asyncHandler(async (req, res) => { await notificationService.markRead(req.user, req.params.id); ok(res, null, 'Marked as read'); }),
  markAllRead: asyncHandler(async (req, res) => { await notificationService.markAllRead(req.user); ok(res, null, 'All notifications marked as read'); }),
};
