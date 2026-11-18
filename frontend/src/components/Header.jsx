import { Link, NavLink } from 'react-router-dom';
import { useCart } from '../features/cart/CartContext';
import { useShopData } from '../features/products/ShopDataContext';
import { API_URL } from '../lib/api';

export default function Header() {
  const { count } = useCart();
  const { live } = useShopData();

  return (
    <header className="header">
      <div className="container header-inner">
        <Link to="/" className="logo">
          🌵 <span>Cactus Shop</span>
        </Link>
        <nav className="header-nav">
          <span className={`live-dot ${live ? 'on' : ''}`} title={live ? 'เชื่อมต่อแบบเรียลไทม์' : 'กำลังเชื่อมต่อ...'}>
            {live ? 'Live' : 'Offline'}
          </span>
          <NavLink to="/track">
            <span className="full">ติดตามออเดอร์</span>
            <span className="short">ติดตาม</span>
          </NavLink>
          <NavLink to="/admin">หลังบ้าน</NavLink>
          <a href={`${API_URL}/api-docs`} target="_blank" rel="noreferrer" className="api-docs-link" title="เอกสาร API (Swagger)">
            API Docs <span aria-hidden="true">↗</span>
          </a>
          <NavLink to="/cart" className="cart-link">
            ตะกร้า {count > 0 && <span className="cart-count">{count}</span>}
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
