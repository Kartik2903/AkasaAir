import { prisma } from '../config/prisma.js';

// Run several writes atomically: withTransaction(async (tx) => { await tx.flight.create(...); ... })
export const withTransaction = (fn) => prisma.$transaction(fn);
