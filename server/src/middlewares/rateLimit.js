import rateLimit from 'express-rate-limit';

const base = { standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Too many requests', errors: [] } };
export const apiLimiter = rateLimit({ ...base, windowMs: 60_000, limit: 300 });
export const authLimiter = rateLimit({ ...base, windowMs: 15 * 60_000, limit: 20 }); // brute-force guard
