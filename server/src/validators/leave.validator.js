import { z } from 'zod';
import { pageQuery, isoDate } from './common.js';

export const STATUSES = ['PENDING_MANAGER', 'PENDING_HOD', 'NEEDS_INFO', 'APPROVED', 'REJECTED', 'CANCELLED'];

export const createLeaveSchema = z.object({
  fromDate: isoDate,
  toDate: isoDate,
  reason: z.string().trim().min(5, 'Please give a short reason (5+ characters)').max(500),
});
export const previewQuery = z.object({ fromDate: z.string().optional(), toDate: z.string().optional() });
export const decisionSchema = z.object({ comment: z.string().trim().max(1000).optional() });
export const strictCommentSchema = z.object({ comment: z.string().trim().min(5, 'A comment of at least 5 characters is required').max(1000) });
export const respondSchema = z.object({ comment: z.string().trim().min(3, 'Please add a short response').max(1000) });

export const listLeavesQuery = pageQuery.extend({
  scope: z.enum(['mine', 'pending', 'team']).default('mine'),
  search: z.string().trim().max(100).optional(),
  status: z.enum(STATUSES).optional(),
  stage: z.enum(['MANAGER', 'HOD']).optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
  sortBy: z.enum(['createdAt', 'fromDate']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export const calendarQuery = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use YYYY-MM').optional(),
  employeeId: z.string().uuid().optional(),
});
export const auditQuery = pageQuery;
