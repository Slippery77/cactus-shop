import { useSearchParams } from 'react-router-dom';
import { useShopData } from './ShopDataContext';
import ProductCard from './ProductCard';

export default function ProductsPage() {
  const { categories, products, categoryById, status, reload } = useShopData();
  const [params, setParams] = useSearchParams();
  const active = params.get('category') || '';
  const shown = active ? products.filter((p) => p.categoryId === active) : products;
  const activeCategory = categoryById.get(active);

  return (
    <div className="container">
      <section className="hero">
        <h1>กระบองเพชรคัดพิเศษ ส่งตรงถึงบ้าน</h1>
        <p>เลือกต้นที่ชอบ ใส่ตะกร้า แล้วกรอกที่อยู่จัดส่งได้เลย สต็อกอัปเดตแบบเรียลไทม์</p>
      </section>

      <nav className="tabs" aria-label="หมวดหมู่">
        <button className={`tab ${!active ? 'active' : ''}`} onClick={() => setParams({})}>
          ทั้งหมด
        </button>
        {categories.map((c) => (
          <button key={c.id} className={`tab ${active === c.id ? 'active' : ''}`} onClick={() => setParams({ category: c.id })}>
            {c.name}
          </button>
        ))}
      </nav>
      {activeCategory && <p className="muted category-desc">{activeCategory.description}</p>}

      {status === 'loading' && <p className="muted">กำลังโหลดสินค้า...</p>}
      {status === 'error' && (
        <div className="alert alert-error">
          เชื่อมต่อเซิร์ฟเวอร์ไม่ได้{' '}
          <button className="btn btn-sm btn-outline" onClick={reload}>
            ลองใหม่
          </button>
        </div>
      )}
      {status === 'ready' && shown.length === 0 && <p className="muted">ยังไม่มีสินค้าในหมวดนี้</p>}

      <div className="grid">
        {shown.map((p) => (
          <ProductCard key={p.id} product={p} category={categoryById.get(p.categoryId)} />
        ))}
      </div>
    </div>
  );
}
