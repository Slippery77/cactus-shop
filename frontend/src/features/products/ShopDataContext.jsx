// เก็บหมวดหมู่ + สินค้าไว้ที่เดียว แล้วฟัง realtime event จาก backend
// ทุกหน้า (รายการสินค้า ตะกร้า checkout) ใช้ข้อมูลชุดนี้ สต็อกจึงตรงกันทั้งเว็บ
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, openEvents } from '../../lib/api';

const ShopDataContext = createContext(null);

export function ShopDataProvider({ children }) {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [live, setLive] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [cats, prods] = await Promise.all([api('/categories'), api('/products')]);
      setCategories(cats);
      // ถ้า realtime event มาถึงก่อนผลโหลดชุดนี้ ให้ตัวที่ updatedAt ใหม่กว่าชนะ กันข้อมูลเก่าทับข้อมูลใหม่
      setProducts((prev) => {
        const prevById = new Map(prev.map((p) => [p.id, p]));
        return prods.map((p) => {
          const cur = prevById.get(p.id);
          return cur && cur.updatedAt > p.updatedAt ? cur : p;
        });
      });
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    reload();
    const close = openEvents('/events', {
      // ทุกครั้งที่ต่อติด (รวมถึงต่อใหม่หลังเน็ตหลุด) ให้โหลดใหม่ทั้งหมด กันข้อมูลตกหล่นช่วงที่หลุด
      ready: () => {
        setLive(true);
        reload();
      },
      'product.updated': (p) =>
        setProducts((list) => (list.some((x) => x.id === p.id) ? list.map((x) => (x.id === p.id ? p : x)) : [...list, p])),
      'product.deleted': ({ id }) => setProducts((list) => list.filter((x) => x.id !== id)),
      error: () => setLive(false),
    });
    return close;
  }, [reload]);

  const value = useMemo(() => {
    const productById = new Map(products.map((p) => [p.id, p]));
    const categoryById = new Map(categories.map((c) => [c.id, c]));
    return { categories, products, productById, categoryById, status, live, reload };
  }, [categories, products, status, live, reload]);

  return <ShopDataContext.Provider value={value}>{children}</ShopDataContext.Provider>;
}

export const useShopData = () => useContext(ShopDataContext);
