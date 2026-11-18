// หลังบ้าน: เปิดใช้ได้เลย ไม่มีระบบ login
import { Router } from 'express';
import * as db from '../db.js';
import { subscribe, broadcastPublic, broadcastAdmin } from '../realtime.js';

const router = Router();

router.get('/events', (req, res) => subscribe('admin', req, res));

// ---------- products ----------
router.post('/products', (req, res) => {
  const product = db.createProduct(req.body || {});
  broadcastPublic('product.updated', product);
  res.status(201).json(product);
});

router.patch('/products/:id', (req, res) => {
  const product = db.updateProduct(req.params.id, req.body || {});
  broadcastPublic('product.updated', product);
  res.json(product);
});

router.delete('/products/:id', (req, res) => {
  db.deleteProduct(req.params.id);
  broadcastPublic('product.deleted', { id: req.params.id });
  res.status(204).end();
});

// ---------- orders ----------
router.get('/orders', (req, res) => {
  res.json(db.listOrders({ status: req.query.status }));
});

router.patch('/orders/:id/status', (req, res) => {
  const { order, changedProducts } = db.updateOrderStatus(req.params.id, req.body?.status);
  for (const p of changedProducts) broadcastPublic('product.updated', p);
  broadcastAdmin('order.updated', order);
  res.json(order);
});

export default router;
