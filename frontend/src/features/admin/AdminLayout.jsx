import { NavLink, Outlet } from 'react-router-dom';
import { API_URL } from '../../lib/api';

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
        <a href={`${API_URL}/api-docs`} target="_blank" rel="noreferrer" className="btn btn-sm btn-ghost">
          API Docs ↗
        </a>
      </div>
      <Outlet />
    </div>
  );
}
