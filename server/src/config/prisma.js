import { PrismaClient } from '@prisma/client';

// One shared client = one connection pool. Pool size: append ?connection_limit=10 to DATABASE_URL.
export const prisma = new PrismaClient();
