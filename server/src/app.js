import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { prisma } from './config/prisma.js';
import routes from './routes/index.js';
import { openapi } from './docs/openapi.js';
import { apiLimiter } from './middlewares/rateLimit.js';
import { notFound, errorHandler } from './middlewares/error.js';

export const app = express();
app.set('trust proxy', 1); // behind Render/AWS load balancer: correct client IPs for rate limiting
app.use(helmet());
app.use(cors({ origin: env.CLIENT_ORIGIN.split(',').map((s) => s.trim()), credentials: true }));
app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/health' } }));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

app.get('/health', async (_req, res) => {
  try { await prisma.$queryRaw`SELECT 1`; res.json({ status: 'ok', db: 'up', uptime: process.uptime() }); }
  catch { res.status(503).json({ status: 'degraded', db: 'down' }); }
});

// Swagger UI needs inline scripts, so it gets a relaxed CSP; everything else keeps Helmet defaults.
app.use('/api/docs', (req, res, next) => { res.removeHeader('Content-Security-Policy'); next(); }, swaggerUi.serve, swaggerUi.setup(openapi));
app.use('/api', apiLimiter, routes);
// Single-origin deploy: serve the built React app and fall back to index.html for client routes.
const dist = path.resolve(import.meta.dirname, '../../client/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist, { index: false, maxAge: '1h' }));
  app.get(/^\/(?!api(\/|$)|health$).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}
app.use(notFound);
app.use(errorHandler);
