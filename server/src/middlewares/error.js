import { ApiError } from '../utils/ApiError.js';
import { isProd } from '../config/env.js';
import { logger } from '../config/logger.js';

export const notFound = (req, _res, next) => next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));

// Maps Prisma errors to HTTP errors; hides internals in production.
export const errorHandler = (err, req, res, _next) => {
  let { status = 500, message = 'Internal server error', errors = [] } = err;
  if (err.code === 'P2002') { status = 409; message = `Duplicate value for: ${err.meta?.target ?? 'field'}`; }
  if (err.code === 'P2025') { status = 404; message = 'Resource not found'; }
  if (err.type === 'entity.parse.failed') { status = 400; message = 'Malformed JSON body'; }
  if (status >= 500) {
    (req.log ?? logger).error({ err }, 'Unhandled error');
    if (isProd) message = 'Internal server error';
  }
  res.status(status).json({ success: false, message, errors, ...(!isProd && status >= 500 && { stack: err.stack }) });
};
