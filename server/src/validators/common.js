import { z } from 'zod';
import { PAGE_DEFAULTS } from '../constants/index.js';

export const idParam = z.object({ id: z.string().uuid('Invalid id') });
export const docParams = z.object({ id: z.string().uuid(), docId: z.string().uuid() });
export const pageQuery = z.object({
  page: z.coerce.number().int().min(1).default(PAGE_DEFAULTS.page),
  limit: z.coerce.number().int().min(1).max(PAGE_DEFAULTS.maxLimit).default(PAGE_DEFAULTS.limit),
});
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
