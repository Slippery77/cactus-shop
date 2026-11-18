// แชตบนหน้าเว็บ ↔ Botnoi ผ่าน Custom Channel (ไม่ใช้ iframe ของ Botnoi)
//
//  หน้าเว็บ --POST /api/chat/send--> backend --(เซ็น HMAC)--> Botnoi webhook
//  Botnoi --POST /api/chat/botnoi-callback--> backend --SSE /api/chat/events--> หน้าเว็บ
//
// env:
//   BOTNOI_WEBHOOK_URL     URL webhook ของ Custom Channel (https://api-gateway.botnoi.ai/webhook/custom/...)
//   BOTNOI_SIGNING_SECRET  signing secret ของ Custom Channel (ห้าม commit)
//   BOTNOI_BOT_ID          bot id
import crypto from 'node:crypto';
import { Router } from 'express';
import { HttpError } from './db.js';

const WEBHOOK_URL = process.env.BOTNOI_WEBHOOK_URL || 'https://api-gateway.botnoi.ai/webhook/custom/6afd77303fa4ba68635804fb';
const SECRET = process.env.BOTNOI_SIGNING_SECRET || '';
const BOT_ID = process.env.BOTNOI_BOT_ID || '6afd5988100bd58a49b7c1e2';

const SESSION_RE = /^[a-zA-Z0-9-]{8,64}$/;
const MAX_TEXT = 1000;

// ---------- SSE ต่อ session ----------
const listeners = new Map(); // sessionId -> Set(res)

function pushToSession(sessionId, event, payload) {
  const set = listeners.get(sessionId);
  if (!set) return 0;
  const msg = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const res of set) res.write(msg);
  return set.size;
}

// ---------- บันทึกล่าสุดไว้ debug (GET /api/chat/log) ----------
const recent = [];
function log(entry) {
  recent.unshift({ at: new Date().toISOString(), ...entry });
  recent.length = Math.min(recent.length, 30);
}

// ---------- กันยิงรัว (ประหยัดเครดิต Botnoi) ----------
const lastSent = new Map();
function throttle(sessionId) {
  const now = Date.now();
  if (now - (lastSent.get(sessionId) || 0) < 1000) throw new HttpError(429, 'ส่งเร็วเกินไป รอสักครู่');
  lastSent.set(sessionId, now);
  if (lastSent.size > 5000) lastSent.clear();
}

// ---------- อ่านคำตอบจาก Botnoi (รองรับหลายรูปแบบ) ----------
const ID_KEYS = ['source_id', 'uid', 'user_id', 'userId', 'recipient_id', 'customer_id', 'sessionId', 'to'];

/** หา session id ใน payload: ค่าแรกที่ตรงกับ session ที่มีคนฟังอยู่ หรือรูปแบบ session */
function findSessionId(obj) {
  const found = [];
  (function walk(v, key) {
    if (v == null) return;
    if (typeof v === 'string' && ID_KEYS.includes(key) && SESSION_RE.test(v)) found.push(v);
    else if (Array.isArray(v)) v.forEach((x) => walk(x, key));
    else if (typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, k);
  })(obj);
  return found.find((id) => listeners.has(id)) || found[0] || null;
}

/** ดึงข้อความตอบกลับทั้งหมด (text, quick reply, ปุ่ม, รูป) ออกมาเป็นรายการ */
function extractMessages(obj) {
  const out = [];
  const seen = new Set();
  const add = (m) => {
    const key = JSON.stringify(m);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(m);
    }
  };
  (function walk(v, key) {
    if (v == null) return;
    if (Array.isArray(v)) return v.forEach((x) => walk(x, key));
    if (typeof v !== 'object') {
      if (typeof v === 'string' && ['text', 'reply', 'answer', 'content'].includes(key) && v.trim()) add({ type: 'text', text: v });
      return;
    }
    const url = v.originalContentUrl || v.image_url || v.imageUrl || (v.type === 'image' && (v.url || v.src));
    if (url) add({ type: 'image', url });
    // ตัวเลือกปุ่ม/quick reply ที่มีแค่ label
    if (typeof v.label === 'string' && !v.text) add({ type: 'option', text: v.label });
    for (const [k, x] of Object.entries(v)) {
      if (['sender', 'source', 'user', 'profile'].includes(k)) continue; // ไม่เอาชื่อผู้ส่ง
      walk(x, k);
    }
  })(obj);
  // ไม่ส่งข้อความที่ลูกค้าพิมพ์กลับไป (ถ้า Botnoi echo มา)
  return out;
}

function verifySignature(rawBody, header) {
  if (!SECRET || !header) return null; // ไม่มีให้ตรวจ
  const expected = 'sha256=' + crypto.createHmac('sha256', SECRET).update(rawBody).digest('hex');
  const a = Buffer.from(String(header));
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ---------- routes ----------
export const chatRouter = Router();

// Express 4 ไม่จับ error ของ async handler ให้เอง
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

chatRouter.get('/events', (req, res) => {
  const sessionId = String(req.query.sessionId || '');
  if (!SESSION_RE.test(sessionId)) return res.status(400).json({ error: 'sessionId ไม่ถูกต้อง' });
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.flushHeaders();
  res.write('retry: 3000\n\nevent: ready\ndata: {}\n\n');
  if (!listeners.has(sessionId)) listeners.set(sessionId, new Set());
  listeners.get(sessionId).add(res);
  const ping = setInterval(() => res.write(': ping\n\n'), 25000);
  req.on('close', () => {
    clearInterval(ping);
    const set = listeners.get(sessionId);
    set?.delete(res);
    if (set && !set.size) listeners.delete(sessionId);
  });
});

chatRouter.post('/send', wrap(async (req, res) => {
  const sessionId = String(req.body?.sessionId || '');
  const text = String(req.body?.text || '').trim().slice(0, MAX_TEXT);
  const displayName = String(req.body?.displayName || '').trim().slice(0, 50) || `ลูกค้าเว็บ ${sessionId.slice(0, 4)}`;
  if (!SESSION_RE.test(sessionId)) throw new HttpError(400, 'sessionId ไม่ถูกต้อง');
  if (!text) throw new HttpError(400, 'กรุณาพิมพ์ข้อความ');
  if (!SECRET) throw new HttpError(503, 'ยังไม่ได้ตั้งค่า BOTNOI_SIGNING_SECRET ที่ backend');
  throttle(sessionId);

  const body = JSON.stringify({
    bot_id: BOT_ID,
    source: { source_id: sessionId, source_type: 'user' },
    sender: { uid: sessionId, display_name: displayName, profile_img_url: '' },
    message: { mid: crypto.randomUUID(), type: 'text', text, timestamp: Date.now() },
  });
  const signature = 'sha256=' + crypto.createHmac('sha256', SECRET).update(body).digest('hex');

  let status = 0;
  let responseText = '';
  try {
    const r = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Platform-Signature': signature,
        'X-Platform-Timestamp': String(Math.floor(Date.now() / 1000)),
      },
      body,
      signal: AbortSignal.timeout(15000),
    });
    status = r.status;
    responseText = (await r.text()).slice(0, 2000);
  } catch (err) {
    log({ dir: 'out', sessionId, status: 'network-error', error: String(err.message || err) });
    throw new HttpError(502, 'ติดต่อ Botnoi ไม่ได้');
  }
  log({ dir: 'out', sessionId, status, response: responseText.slice(0, 500) });
  if (status >= 400) throw new HttpError(502, `Botnoi ตอบกลับ ${status}`);

  // บาง platform ส่งคำตอบกลับมาใน response ทันที ถ้ามีก็ส่งขึ้นหน้าเว็บเลย
  let replies = [];
  try {
    replies = extractMessages(JSON.parse(responseText));
  } catch {
    /* ไม่ใช่ JSON */
  }
  if (replies.length) pushToSession(sessionId, 'bot', { messages: replies });
  res.json({ ok: true });
}));

// Botnoi ส่งคำตอบของบอทมาที่นี่ (ตั้งเป็น URL ของ Custom Channel)
chatRouter.post('/botnoi-callback', (req, res) => {
  const raw = req.rawBody || JSON.stringify(req.body || {});
  const signatureOk = verifySignature(raw, req.get('x-platform-signature'));
  const sessionId = findSessionId(req.body);
  const messages = extractMessages(req.body);
  const delivered = sessionId && messages.length ? pushToSession(sessionId, 'bot', { messages }) : 0;
  log({ dir: 'in', sessionId, signatureOk, delivered, messages: messages.length, raw: raw.slice(0, 1500) });
  res.json({ ok: true });
});

// บางระบบเรียก GET เพื่อตรวจว่า URL ใช้งานได้
chatRouter.get('/botnoi-callback', (req, res) => {
  if (req.query.challenge) return res.type('text').send(String(req.query.challenge));
  res.json({ ok: true });
});

// debug: ดูการรับส่งล่าสุด
chatRouter.get('/log', (_req, res) => res.json({ configured: Boolean(SECRET), webhook: WEBHOOK_URL, recent }));
