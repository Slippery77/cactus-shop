import { NavLink, Outlet } from 'react-router-dom';

export default function AdminLayout() {
  return (
    <div className="container">
      <div className="admin-bar">
        <nav className="tabs">
          <NavLink to="/admin" end className="tab">
            คำสั่งซื้อ
          </NavLink>
          <NavLink to="/admin/products" className="tab">
            สินค้า / สต็อก
          </NavLink>
        </nav>
      </div>
      <Outlet />
    </div>
  );
}
