// ที่เก็บข้อมูลแบบเบา: เก็บทั้งหมดใน JSON file ไฟล์เดียว และถือไว้ใน memory
// ทุกฟังก์ชันที่แก้ข้อมูลเป็นแบบ synchronous ทั้งหมด (อ่าน → เช็ก → แก้ → เขียนไฟล์ โดยไม่มี await คั่น)
// Node.js รันทีละ request ใน event loop เดียว จึงไม่มีสองคำสั่งซื้อแทรกกันกลางทาง = ตัดสต็อกแบบ atomic
// ถ้าวันหลังจะย้ายไป PostgreSQL ให้แก้แค่ไฟล์นี้ไฟล์เดียว (route ไม่ต้องแก้)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createSeedData } from './seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.resolve(process.env.DB_FILE || path.join(__dirname, '..', 'data', 'db.json'));

let data = load();

function load() {
  if (!fs.existsSync(DB_FILE)) {
    const seeded = createSeedData();
    persist(seeded);
    return seeded;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function persist(next = data) {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  const tmp = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(next, null, 2));
  fs.renameSync(tmp, DB_FILE); // เขียนไฟล์ชั่วคราวก่อนแล้ว rename กันไฟล์พังถ้าเขียนไม่จบ
}

export function resetDb() {
  data = createSeedData();
  persist();
}

export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const now = () => new Date().toISOString();

// ---------- categories ----------
export const listCategories = () => data.categories;

// ---------- products ----------
export function listProducts({ category } = {}) {
  return category ? data.products.filter((p) => p.categoryId === category) : data.products;
}

export function getProduct(id) {
  return data.products.find((p) => p.id === id) || null;
}

function cleanProductInput(input, { partial }) {
  const out = {};
  const has = (k) => input[k] !== undefined;

  if (has('name') || !partial) {
    const name = String(input.name ?? '').trim();
    if (!name) throw new HttpError(400, 'กรุณาระบุชื่อสินค้า');
    out.name = name;
  }
  if (has('categoryId') || !partial) {
    if (!data.categories.some((c) => c.id === input.categoryId)) throw new HttpError(400, 'หมวดหมู่ไม่ถูกต้อง');
    out.categoryId = input.categoryId;
  }
  if (has('price') || !partial) {
    const price = Number(input.price);
    if (!Number.isFinite(price) || price < 0) throw new HttpError(400, 'ราคาต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป');
    out.price = Math.round(price * 100) / 100;
  }
  if (has('stock') || !partial) {
    const stock = Number(input.stock);
    if (!Number.isInteger(stock) || stock < 0) throw new HttpError(400, 'สต็อกต้องเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป');
    out.stock = stock;
  }
  if (has('description')) out.description = String(input.description).trim();
  if (has('imageUrl')) out.imageUrl = String(input.imageUrl).trim();
  return out;
}

export function createProduct(input) {
  const product = {
    id: crypto.randomUUID(),
    description: '',
    imageUrl: '',
    ...cleanProductInput(input, { partial: false }),
    createdAt: now(),
    updatedAt: now(),
  };
  data.products.push(product);
  persist();
  return product;
}

export function updateProduct(id, input) {
  const product = getProduct(id);
  if (!product) throw new HttpError(404, 'ไม่พบสินค้า');
  const changes = cleanProductInput(input, { partial: true });
  // เปลี่ยนรูปแล้ว เครดิตของรูปเดิมไม่ตรงอีกต่อไป
  if (changes.imageUrl !== undefined && changes.imageUrl !== product.imageUrl) {
    delete product.imageCredit;
    delete product.imageSource;
  }
  Object.assign(product, changes, { updatedAt: now() });
  persist();
  return product;
}

export function deleteProduct(id) {
  const idx = data.products.findIndex((p) => p.id === id);
  if (idx === -1) throw new HttpError(404, 'ไม่พบสินค้า');
  data.products.splice(idx, 1);
  persist();
}

// ---------- orders ----------
export const ORDER_STATUSES = ['pending', 'shipping', 'completed', 'cancelled'];

const req = (v, msg) => {
  const s = String(v ?? '').trim();
  if (!s) throw new HttpError(400, msg);
  return s;
};

function cleanOrderInput(input) {
  const c = input.customer || {};
  const a = input.address || {};
  const phone = req(c.phone, 'กรุณากรอกเบอร์โทร').replace(/[\s-]/g, '');
  if (!/^0\d{8,9}$/.test(phone)) throw new HttpError(400, 'เบอร์โทรต้องขึ้นต้นด้วย 0 และมี 9-10 หลัก');
  const zipCode = req(a.zipCode, 'กรุณากรอกรหัสไปรษณีย์');
  if (!/^\d{5}$/.test(zipCode)) throw new HttpError(400, 'รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก');

  if (!Array.isArray(input.items) || input.items.length === 0) throw new HttpError(400, 'ไม่มีสินค้าในคำสั่งซื้อ');
  const qtyById = new Map();
  for (const it of input.items) {
    const qty = Number(it?.qty);
    if (!it?.productId || !Number.isInteger(qty) || qty < 1) throw new HttpError(400, 'รายการสินค้าไม่ถูกต้อง');
    qtyById.set(it.productId, (qtyById.get(it.productId) || 0) + qty); // รวมรายการซ้ำ
  }

  return {
    customer: { name: req(c.name, 'กรุณากรอกชื่อผู้รับ'), phone },
    address: {
      houseNo: req(a.houseNo, 'กรุณากรอกบ้านเลขที่'),
      moo: String(a.moo ?? '').trim(),
      street: String(a.street ?? '').trim(),
      subDistrict: req(a.subDistrict, 'กรุณาเลือกตำบล/แขวง'),
      district: req(a.district, 'กรุณาเลือกอำเภอ/เขต'),
      province: req(a.province, 'กรุณาเลือกจังหวัด'),
      zipCode,
    },
    note: String(input.note ?? '').trim().slice(0, 500),
    qtyById,
  };
}

/** สร้างคำสั่งซื้อ + ตัดสต็อก ทำทั้งหมดหรือไม่ทำเลย คืนค่า { order, changedProducts } */
export function createOrder(input) {
  const { qtyById, ...info } = cleanOrderInput(input);

  // 1) เช็กสต็อกทุกรายการก่อน ยังไม่แตะข้อมูล
  const problems = [];
  const lines = [];
  for (const [productId, qty] of qtyById) {
    const product = getProduct(productId);
    if (!product) problems.push({ productId, reason: 'not_found', available: 0 });
    else if (product.stock < qty) problems.push({ productId, name: product.name, reason: 'insufficient_stock', requested: qty, available: product.stock });
    else lines.push({ product, qty });
  }
  if (problems.length) throw new HttpError(409, 'สินค้าบางรายการมีไม่พอ', problems);

  // 2) ผ่านทุกรายการแล้วค่อยตัดสต็อกและสร้างออเดอร์
  const ts = now();
  for (const { product, qty } of lines) {
    product.stock -= qty;
    product.updatedAt = ts;
  }
  data.counters.order += 1;
  const items = lines.map(({ product, qty }) => ({ productId: product.id, name: product.name, price: product.price, qty }));
  const order = {
    id: crypto.randomUUID(),
    // เลขออเดอร์ CTyyMMdd-0001 (ใช้วันที่เวลาไทย)
    orderNo: `CT${new Date(ts).toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' }).slice(2).replace(/-/g, '')}-${String(data.counters.order).padStart(4, '0')}`,
    ...info,
    items,
    total: items.reduce((s, i) => s + i.price * i.qty, 0),
    status: 'pending',
    createdAt: ts,
    updatedAt: ts,
  };
  data.orders.unshift(order);
  persist();
  return { order, changedProducts: lines.map((l) => l.product) };
}

export function listOrders({ status } = {}) {
  return status ? data.orders.filter((o) => o.status === status) : data.orders;
}

export function findOrderByNo(orderNo) {
  return data.orders.find((o) => o.orderNo === orderNo) || null;
}

/** เปลี่ยนสถานะ ถ้าเปลี่ยนเป็น cancelled จะคืนสต็อก คืนค่า { order, changedProducts } */
export function updateOrderStatus(id, status) {
  if (!ORDER_STATUSES.includes(status)) throw new HttpError(400, 'สถานะไม่ถูกต้อง');
  const order = data.orders.find((o) => o.id === id);
  if (!order) throw new HttpError(404, 'ไม่พบคำสั่งซื้อ');
  if (order.status === 'cancelled') throw new HttpError(409, 'คำสั่งซื้อนี้ถูกยกเลิกแล้ว เปลี่ยนสถานะไม่ได้');

  const changedProducts = [];
  const ts = now();
  if (status === 'cancelled') {
    for (const item of order.items) {
      const product = getProduct(item.productId);
      if (product) {
        product.stock += item.qty;
        product.updatedAt = ts;
        changedProducts.push(product);
      }
    }
  }
  order.status = status;
  order.updatedAt = ts;
  persist();
  return { order, changedProducts };
}
