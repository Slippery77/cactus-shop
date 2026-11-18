// Auth ของ admin แบบง่าย: รหัสผ่านเดียวจาก env → ได้ token ที่เซ็นด้วย HMAC อายุ 12 ชม.
import crypto from 'node:crypto';
import { HttpError } from './db.js';

const SECRET = process.env.TOKEN_SECRET || crypto.randomBytes(32).toString('hex');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin1234';
const TTL_MS = 12 * 60 * 60 * 1000;

if (!process.env.ADMIN_PASSWORD) {
  console.warn('[auth] ADMIN_PASSWORD not set, using default "admin1234". Set it before deploying.');
}

const sign = (payload) => crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export function login(password) {
  if (!safeEqual(password ?? '', ADMIN_PASSWORD)) throw new HttpError(401, 'รหัสผ่านไม่ถูกต้อง');
  const expiresAt = Date.now() + TTL_MS;
  const payload = `admin.${expiresAt}`;
  return { token: `${payload}.${sign(payload)}`, expiresAt: new Date(expiresAt).toISOString() };
}

export function verifyToken(token) {
  const [role, exp, sig] = String(token || '').split('.');
  if (role !== 'admin' || !exp || !sig) return false;
  if (!safeEqual(sig, sign(`${role}.${exp}`))) return false;
  return Number(exp) > Date.now();
}

/** middleware: รับ token จาก header Authorization: Bearer <token> หรือ ?token= (สำหรับ EventSource) */
export function requireAdmin(req, _res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : req.query.token;
  if (!verifyToken(token)) return next(new HttpError(401, 'กรุณาเข้าสู่ระบบผู้ดูแล'));
  next();
}
