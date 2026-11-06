import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';

const sign = (user) => jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN, algorithm: 'HS256' });
// Pre-computed hash so unknown emails cost the same time as wrong passwords (no enumeration by timing).
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

export const profile = async (id) => {
  const u = await prisma.user.findUnique({ where: { id }, include: { department: { select: { name: true } }, manager: { select: { name: true } } } });
  return { id: u.id, name: u.name, email: u.email, role: u.role, departmentId: u.departmentId, department: u.department.name, managerName: u.manager?.name ?? null };
};

export const authService = {
  async login({ email, password }) {
    const user = await prisma.user.findUnique({ where: { email } });
    const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !valid) throw ApiError.unauthorized('Invalid email or password');
    return { user: await profile(user.id), token: sign(user) };
  },
};
