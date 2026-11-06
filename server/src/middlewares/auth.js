import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { COOKIE_NAME } from '../constants/index.js';
import { ApiError } from '../utils/ApiError.js';
import { prisma } from '../config/prisma.js';

const extractToken = (req) => req.cookies?.[COOKIE_NAME] ?? req.headers.authorization?.replace(/^Bearer /, '');

// Verifies the JWT, then loads the user from the DB so role/department changes apply immediately.
export const authenticate = async (req, _res, next) => {
  try {
    const token = extractToken(req);
    if (!token) throw ApiError.unauthorized();
    let payload;
    try { payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }); }
    catch { throw ApiError.unauthorized('Invalid or expired token'); }
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw ApiError.unauthorized('User no longer exists');
    req.user = { id: user.id, email: user.email, name: user.name, role: user.role, departmentId: user.departmentId, managerId: user.managerId };
    next();
  } catch (e) { next(e); }
};

export const authorize = (...roles) => (req, _res, next) =>
  roles.includes(req.user?.role) ? next() : next(ApiError.forbidden('Insufficient permissions'));
