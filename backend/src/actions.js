// งานหลักที่ทั้ง REST API และ MCP (chatbot) ใช้ร่วมกัน
// รวมไว้ที่เดียว ทั้งสองทางจะได้ทำงานเหมือนกันทุกอย่าง รวมถึงส่ง realtime event
import * as db from './db.js';
import { broadcastPublic, broadcastAdmin } from './realtime.js';

/** สร้างคำสั่งซื้อ + ตัดสต็อก + แจ้ง realtime */
export function placeOrder(input) {
  const { order, changedProducts } = db.createOrder(input);
  for (const p of changedProducts) broadcastPublic('product.updated', p);
  broadcastAdmin('order.created', order);
  return order;
}

/** หาออเดอร์ด้วยเลขออเดอร์ + เบอร์โทร (ต้องตรงกัน) คืนเฉพาะข้อมูลที่ไม่ใช่ข้อมูลส่วนตัว */
export function lookupOrder(orderNo, phone) {
  const order = db.findOrderByNo(String(orderNo || '').trim().toUpperCase());
  const cleanPhone = String(phone || '').replace(/[\s-]/g, '');
  if (!order || order.customer.phone !== cleanPhone) {
    throw new db.HttpError(404, 'ไม่พบคำสั่งซื้อ หรือเบอร์โทรไม่ตรงกัน');
  }
  const { id, orderNo: no, status, items, total, createdAt, updatedAt } = order;
  return { id, orderNo: no, status, items, total, createdAt, updatedAt };
}
