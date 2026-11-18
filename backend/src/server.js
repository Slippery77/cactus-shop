import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';
import publicRoutes from './routes/public.js';
import adminRoutes from './routes/admin.js';
import { HttpError } from './db.js';
import { handleMcp, mcpMethodNotAllowed, mcpLog } from './mcp.js';
import { chatRouter } from './chat.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 4000;
const origins = (process.env.CORS_ORIGIN || '*').split(',').map((s) => s.trim());

const app = express();
app.use(cors({ origin: origins.includes('*') ? true : origins }));
// เก็บ body ดิบไว้ตรวจลายเซ็นของ Botnoi callback
app.use(express.json({ limit: '100kb', verify: (req, _res, buf) => { req.rawBody = buf.toString('utf8'); } }));

// API docs (Swagger UI) → http://localhost:4000/api-docs
const openapi = YAML.parse(fs.readFileSync(path.join(__dirname, 'openapi.yaml'), 'utf8'));
app.get('/api-docs/openapi.json', (_req, res) => res.json(openapi));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapi, { customSiteTitle: 'Cactus Shop API' }));

// MCP สำหรับ chatbot (Botnoi AI Agent ฯลฯ) → POST http://localhost:4000/mcp
app.post('/mcp', handleMcp);
app.get('/mcp/log', mcpLog); // debug: ดู request ล่าสุดจาก chatbot
app.get('/mcp', mcpMethodNotAllowed);
app.delete('/mcp', mcpMethodNotAllowed);

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/chat', chatRouter); // แชตบนเว็บ ↔ Botnoi Custom Channel
app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);

app.use('/api', (_req, _res, next) => next(new HttpError(404, 'ไม่พบ endpoint นี้')));

// error handler กลาง: ทุก error ตอบเป็น { error, details? }
app.use((err, _req, res, _next) => {
  if (err.type === 'entity.parse.failed') err = new HttpError(400, 'JSON ไม่ถูกต้อง');
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? 'เกิดข้อผิดพลาดในระบบ' : err.message, ...(err.details && { details: err.details }) });
});

app.listen(PORT, () => {
  console.log(`Cactus Shop API  → http://localhost:${PORT}/api`);
  console.log(`API docs         → http://localhost:${PORT}/api-docs`);
  console.log(`MCP (chatbot)    → http://localhost:${PORT}/mcp`);
});
