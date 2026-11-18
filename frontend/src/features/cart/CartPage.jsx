import { Link, useNavigate } from 'react-router-dom';
import { baht } from '../../lib/format';
import { useCart } from './CartContext';
import CactusImage from '../products/CactusImage';

export function QtyStepper({ value, max, onChange }) {
  return (
    <div className="qty">
      <button type="button" onClick={() => onChange(value - 1)} disabled={value <= 1} aria-label="ลดจำนวน">
        −
      </button>
      <span>{value}</span>
      <button type="button" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="เพิ่มจำนวน">
        +
      </button>
    </div>
  );
}

export default function CartPage() {
  const cart = useCart();
  const navigate = useNavigate();

  if (cart.lines.length === 0)
    return (
      <div className="container empty">
        <p>ตะกร้ายังว่างอยู่</p>
        <Link to="/" className="btn btn-primary">
          เลือกซื้อสินค้า
        </Link>
      </div>
    );

  return (
    <div className="container narrow">
      <h1>ตะกร้าสินค้า</h1>
      {cart.hasProblem && (
        <div className="alert alert-warn">
          สต็อกบางรายการเปลี่ยนไป ต้องปรับตะกร้าก่อนสั่งซื้อ{' '}
          <button className="btn btn-sm btn-outline" onClick={cart.fixToStock}>
            ปรับตามสต็อกให้อัตโนมัติ
          </button>
        </div>
      )}
      <div className="card">
        {cart.lines.map(({ productId, qty, product, problem }) => (
          <div key={productId} className={`cart-line ${problem ? 'has-problem' : ''}`}>
            {product ? <CactusImage product={product} /> : <div className="cactus-img" />}
            <div className="cart-line-info">
              <strong>{product?.name || 'สินค้าที่ถูกลบ'}</strong>
              {product && <span className="muted">{baht(product.price)} / ชิ้น</span>}
              {problem && <span className="text-danger">{problem}</span>}
            </div>
            {product && product.stock > 0 && (
              <QtyStepper value={qty} max={product.stock} onChange={(n) => cart.setQty(productId, Math.min(n, product.stock))} />
            )}
            <strong className="cart-line-total">{product ? baht(product.price * qty) : '-'}</strong>
            <button className="icon-btn" onClick={() => cart.remove(productId)} aria-label="ลบออกจากตะกร้า">
              ✕
            </button>
          </div>
        ))}
        <div className="cart-summary">
          <span>รวมทั้งหมด</span>
          <strong className="price price-lg">{baht(cart.total)}</strong>
        </div>
      </div>
      <div className="actions">
        <Link to="/" className="btn btn-outline">
          เลือกซื้อต่อ
        </Link>
        <button className="btn btn-primary" disabled={cart.hasProblem} onClick={() => navigate('/checkout')}>
          ไปหน้าสั่งซื้อ
        </button>
      </div>
    </div>
  );
}
