// ตะกร้าเก็บแค่ { productId, qty } ใน localStorage
// ราคา/สต็อกจริงดึงจาก ShopData (realtime) ทุกครั้ง จึงรู้ทันทีถ้าสินค้าหมดระหว่างที่อยู่ในตะกร้า
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useShopData } from '../products/ShopDataContext';

const STORAGE_KEY = 'cactus-cart';
const CartContext = createContext(null);

function loadCart() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const { productById, status } = useShopData();
  const [items, setItems] = useState(loadCart);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const qtyInCart = useCallback((productId) => items.find((i) => i.productId === productId)?.qty || 0, [items]);

  /** เพิ่มลงตะกร้า ไม่ให้เกินสต็อก คืน true ถ้าเพิ่มได้ */
  const add = useCallback(
    (productId, qty = 1) => {
      const product = productById.get(productId);
      if (!product || product.stock <= 0) return false;
      const current = qtyInCart(productId);
      const next = Math.min(current + qty, product.stock);
      if (next === current) return false;
      setItems((list) =>
        current ? list.map((i) => (i.productId === productId ? { ...i, qty: next } : i)) : [...list, { productId, qty: next }],
      );
      return true;
    },
    [productById, qtyInCart],
  );

  const setQty = useCallback((productId, qty) => {
    setItems((list) => list.map((i) => (i.productId === productId ? { ...i, qty: Math.max(1, qty) } : i)));
  }, []);

  const remove = useCallback((productId) => setItems((list) => list.filter((i) => i.productId !== productId)), []);
  const clear = useCallback(() => setItems([]), []);

  /** ปรับจำนวนในตะกร้าให้ไม่เกินสต็อกปัจจุบัน และเอาของที่หมด/ถูกลบออก */
  const fixToStock = useCallback(() => {
    setItems((list) =>
      list
        .map((i) => ({ ...i, qty: Math.min(i.qty, productById.get(i.productId)?.stock || 0) }))
        .filter((i) => i.qty > 0),
    );
  }, [productById]);

  const value = useMemo(() => {
    const lines = items.map((i) => {
      const product = productById.get(i.productId);
      let problem = null;
      if (status === 'ready') {
        if (!product) problem = 'สินค้านี้ถูกนำออกจากร้านแล้ว';
        else if (product.stock === 0) problem = 'สินค้าหมดแล้ว';
        else if (i.qty > product.stock) problem = `เหลือเพียง ${product.stock} ชิ้น`;
      }
      return { ...i, product, problem };
    });
    const total = lines.reduce((s, l) => s + (l.product ? l.product.price * l.qty : 0), 0);
    const count = items.reduce((s, i) => s + i.qty, 0);
    const hasProblem = lines.some((l) => l.problem);
    return { lines, total, count, hasProblem, add, setQty, remove, clear, fixToStock, qtyInCart };
  }, [items, productById, status, add, setQty, remove, clear, fixToStock, qtyInCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
