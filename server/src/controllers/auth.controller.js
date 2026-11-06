import { authService, profile } from '../services/auth.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/response.js';
import { env, isProd } from '../config/env.js';
import { COOKIE_NAME } from '../constants/index.js';

// HttpOnly keeps the JWT out of reach of XSS; SameSite + restricted CORS mitigate CSRF.
const cookieOpts = { httpOnly: true, secure: isProd || env.COOKIE_SAMESITE === 'none', sameSite: env.COOKIE_SAMESITE, maxAge: 24 * 60 * 60 * 1000, path: '/' };

export const authController = {
  login: asyncHandler(async (req, res) => {
    const { user, token } = await authService.login(req.body);
    res.cookie(COOKIE_NAME, token, cookieOpts);
    ok(res, user, 'Logged in successfully');
  }),
  logout: (_req, res) => { res.clearCookie(COOKIE_NAME, { ...cookieOpts, maxAge: undefined }); ok(res, null, 'Logged out successfully'); },
  me: asyncHandler(async (req, res) => ok(res, await profile(req.user.id), 'Current user')),
};
