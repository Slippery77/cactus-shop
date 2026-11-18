import { Router } from 'express';
import * as db from '../db.js';
import { subscribe } from '../realtime.js';
import { placeOrder, lookupOrder } from '../actions.js';

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
  res.status(201).json(placeOrder(req.body || {}));
});

// เช็กสถานะออเดอร์ (ใช้กับหน้า "ติดตามคำสั่งซื้อ" และ chatbot) ต้องใส่เบอร์โทรให้ตรงกันด้วย
router.get('/orders/:orderNo', (req, res) => {
  res.json(lookupOrder(req.params.orderNo, req.query.phone));
});

router.get('/events', (req, res) => subscribe('public', req, res));

export default router;
