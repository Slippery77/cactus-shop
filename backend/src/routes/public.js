import { Router } from 'express';
import * as db from '../db.js';
import { subscribe, broadcastPublic, broadcastAdmin } from '../realtime.js';

const router = Router();

router.get('/categories', (_req, res) => {
  res.json(db.listCategories());
});

router.get('/products', (req, res) => {
  res.json(db.listProducts({ category: req.query.category }));
});

router.get('/products/:id', (req, res, next) => {
  const product = db.getProduct(req.params.id);
  if (!product) return next(new db.HttpError(404, 'ไม่พบสินค้า'));
  res.json(product);
});

router.post('/orders', (req, res) => {
  const { order, changedProducts } = db.createOrder(req.body || {});
  for (const p of changedProducts) broadcastPublic('product.updated', p);
  broadcastAdmin('order.created', order);
  res.status(201).json(order);
});

// เช็กสถานะออเดอร์ (ใช้กับหน้า "ติดตามคำสั่งซื้อ" และ chatbot) ต้องใส่เบอร์โทรให้ตรงกันด้วย
router.get('/orders/:orderNo', (req, res, next) => {
  const order = db.findOrderByNo(req.params.orderNo.trim().toUpperCase());
  const phone = String(req.query.phone || '').replace(/[\s-]/g, '');
  if (!order || order.customer.phone !== phone) return next(new db.HttpError(404, 'ไม่พบคำสั่งซื้อ หรือเบอร์โทรไม่ตรงกัน'));
  const { id, orderNo, status, items, total, createdAt, updatedAt } = order;
  res.json({ id, orderNo, status, items, total, createdAt, updatedAt });
});

router.get('/events', (req, res) => subscribe('public', req, res));

export default router;
