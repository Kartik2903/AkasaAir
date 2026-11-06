import { PAGE_DEFAULTS } from '../constants/index.js';

export const buildMeta = (total, page, limit) => ({
  total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)),
});

export const toSkipTake = ({ page = PAGE_DEFAULTS.page, limit = PAGE_DEFAULTS.limit }) => ({
  skip: (page - 1) * limit,
  take: limit,
});
