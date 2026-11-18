// MCP server สำหรับ chatbot (เช่น Botnoi AI Agent)
// endpoint: POST /mcp (Streamable HTTP แบบ stateless, ตอบกลับเป็น JSON)
// เครื่องมือ: list_products, track_order, create_order
// ไม่มีเครื่องมือฝั่ง admin เพื่อให้แชตแก้สต็อก/ลบสินค้า/ดูข้อมูลลูกค้าคนอื่นไม่ได้
import { AsyncLocalStorage } from 'node:async_hooks';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import * as db from './db.js';
import { placeOrder, lookupOrder } from './actions.js';

const STATUS_TH = { pending: 'รอดำเนินการ', shipping: 'กำลังจัดส่ง', completed: 'จัดส่งสำเร็จ', cancelled: 'ยกเลิกแล้ว' };

const ok = (data) => ({ content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] });
const fail = (message, details) => ({
  isError: true,
  content: [{ type: 'text', text: JSON.stringify({ error: message, ...(details && { details }) }, null, 2) }],
});

/** แปลง error จาก db (HttpError) เป็นคำตอบของ tool แทนการ throw */
function run(fn) {
  const entry = ctx.getStore();
  try {
    const result = ok(fn());
    if (entry) entry.toolResult = 'ok';
    return result;
  } catch (err) {
    if (entry) entry.toolResult = `error: ${err.message}`;
    if (err instanceof db.HttpError) return fail(err.message, err.details);
    console.error('[mcp]', err);
    return fail('เกิดข้อผิดพลาดในระบบ');
  }
}

function buildServer() {
  const server = new McpServer({ name: 'cactus-shop', version: '1.0.0' });

  server.registerTool(
    'list_products',
    {
      title: 'ดูสินค้า',
      description:
        'List cacti for sale with live price and stock. Use this before recommending plants, answering price/stock questions, or placing an order (to get the product id). stock = 0 means sold out.',
      inputSchema: {
        category: z
          .enum(['astrophytum', 'mammillaria', 'moon-cactus'])
          .optional()
          .describe('Filter by category. Omit to list everything.'),
      },
    },
    async ({ category }) =>
      run(() => {
        const categories = new Map(db.listCategories().map((c) => [c.id, c.name]));
        return db.listProducts({ category }).map((p) => ({
          id: p.id,
          name: p.name,
          category: categories.get(p.categoryId) || p.categoryId,
          price: p.price,
          stock: p.stock,
          inStock: p.stock > 0,
          description: p.description,
        }));
      }),
  );

  server.registerTool(
    'track_order',
    {
      title: 'เช็กสถานะออเดอร์',
      description:
        'Look up an order status. Requires BOTH the order number (e.g. CT261118-0001) and the phone number used when ordering; they must match.',
      inputSchema: {
        orderNo: z.string().describe('Order number, e.g. CT261118-0001'),
        phone: z.string().describe('Phone number used for the order, e.g. 0812345678'),
      },
    },
    async ({ orderNo, phone }) =>
      run(() => {
        const order = lookupOrder(orderNo, phone);
        return { ...order, statusText: STATUS_TH[order.status] || order.status };
      }),
  );

  server.registerTool(
    'create_order',
    {
      title: 'สั่งซื้อ',
      description:
        'Place an order and reserve stock. Only call this AFTER showing the customer a full summary (items, quantities, total, address) and they explicitly confirmed. Call once per confirmation. There is no online payment; the shop contacts the customer afterwards. Returns orderNo on success.',
      inputSchema: {
        name: z.string().describe('Recipient full name'),
        phone: z.string().describe('Recipient phone, starts with 0, 9-10 digits'),
        houseNo: z.string().describe('House number, e.g. 99/1'),
        moo: z.string().optional().describe('Village number (หมู่), optional'),
        street: z.string().optional().describe('Street / soi / village name, optional'),
        subDistrict: z.string().describe('Sub-district (ตำบล/แขวง)'),
        district: z.string().describe('District (อำเภอ/เขต)'),
        province: z.string().describe('Province (จังหวัด)'),
        zipCode: z.string().describe('5-digit postal code'),
        note: z.string().optional().describe('Note to the shop, optional'),
        items: z
          .array(
            z.object({
              productId: z.string().describe('Product id from list_products, e.g. moon-001'),
              qty: z.coerce.number().int().min(1).describe('Quantity'),
            }),
          )
          .min(1)
          .describe('Plants to order'),
      },
    },
    async (args) =>
      run(() => {
        const order = placeOrder({
          customer: { name: args.name, phone: args.phone },
          address: {
            houseNo: args.houseNo,
            moo: args.moo || '',
            street: args.street || '',
            subDistrict: args.subDistrict,
            district: args.district,
            province: args.province,
            zipCode: args.zipCode,
          },
          note: args.note || '',
          items: args.items,
        });
        return {
          orderNo: order.orderNo,
          status: order.status,
          statusText: STATUS_TH[order.status],
          items: order.items,
          total: order.total,
        };
      }),
  );

  return server;
}

// ---------- บันทึก request ล่าสุด (ไว้ debug การเชื่อมต่อกับ chatbot) ----------
// เก็บเฉพาะข้อมูลการเชื่อมต่อ ไม่เก็บ arguments (ชื่อ/ที่อยู่/เบอร์ลูกค้า)
const recent = [];
const ctx = new AsyncLocalStorage();

function logEntry(entry) {
  recent.unshift(entry);
  recent.length = Math.min(recent.length, 30);
}

/** GET /mcp/log → ดู 30 request ล่าสุดที่เข้ามาที่ /mcp */
export function mcpLog(_req, res) {
  res.json(recent);
}

/** Express handler: ทุก request สร้าง server + transport ใหม่ (stateless) */
export async function handleMcp(req, res) {
  const started = Date.now();
  const body = req.body;
  const messages = Array.isArray(body) ? body : [body];
  const accept = String(req.headers.accept || '');
  // ตอบแบบที่ client ขอ: ถ้ารับ text/event-stream ได้ ตอบเป็น SSE (ค่ามาตรฐาน), ถ้าขอแค่ JSON ตอบเป็น JSON
  const jsonMode = !accept.includes('text/event-stream');
  const entry = {
    at: new Date(started).toISOString(),
    rpc: messages.map((m) => m?.method || (m?.result ? 'result' : '?')).join(','),
    tool: messages.find((m) => m?.method === 'tools/call')?.params?.name,
    accept,
    contentType: req.headers['content-type'],
    sessionId: req.headers['mcp-session-id'],
    protocolVersion: req.headers['mcp-protocol-version'],
    userAgent: String(req.headers['user-agent'] || '').slice(0, 80),
    mode: jsonMode ? 'json' : 'sse',
  };
  res.on('finish', () => {
    entry.status = res.statusCode;
    entry.ms = Date.now() - started;
  });
  logEntry(entry);

  const server = buildServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: jsonMode });
  res.on('close', () => {
    transport.close();
    server.close();
  });
  // spec ให้ client ส่ง Accept ทั้งสองแบบ ถ้าไม่ครบ SDK จะตอบ 406 จึงเติมให้ครบ (แต่ยังตอบตามแบบที่ client ขอ)
  req.headers.accept = 'application/json, text/event-stream';
  try {
    await server.connect(transport);
    await ctx.run(entry, () => transport.handleRequest(req, res, body));
  } catch (err) {
    console.error('[mcp]', err);
    if (!res.headersSent) {
      res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' }, id: null });
    }
  }
}

/** GET/DELETE /mcp ไม่รองรับในโหมด stateless */
export function mcpMethodNotAllowed(_req, res) {
  res.status(405).set('Allow', 'POST').json({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed.' }, id: null });
}
