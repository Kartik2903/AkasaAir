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
app.use(notFound);
app.use(errorHandler);
