import { app } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { prisma } from './config/prisma.js';

const server = app.listen(env.PORT, () => logger.info(`API listening on :${env.PORT} (${env.NODE_ENV})`));

const shutdown = (signal) => {
  logger.info(`${signal} received, shutting down`);
  server.close(async () => { await prisma.$disconnect(); process.exit(0); });
  setTimeout(() => process.exit(1), 10_000).unref(); // force-exit if connections hang
};
['SIGINT', 'SIGTERM'].forEach((s) => process.on(s, () => shutdown(s)));
