import { Route, Routes } from 'react-router-dom';
import Header from './components/Header';
import BotnoiChat from './components/BotnoiChat';
import ProductsPage from './features/products/ProductsPage';
import ProductDetailPage from './features/products/ProductDetailPage';
import CartPage from './features/cart/CartPage';
import CheckoutPage from './features/checkout/CheckoutPage';
import OrderSuccessPage from './features/checkout/OrderSuccessPage';
import TrackOrderPage from './features/orders/TrackOrderPage';
import AdminLayout from './features/admin/AdminLayout';
import AdminOrdersPage from './features/admin/AdminOrdersPage';
import AdminProductsPage from './features/admin/AdminProductsPage';

export default function App() {
  return (
    <>
      <Header />
      <BotnoiChat />
      <main>
        <Routes>
          <Route path="/" element={<ProductsPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/order-success/:orderNo" element={<OrderSuccessPage />} />
          <Route path="/track" element={<TrackOrderPage />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminOrdersPage />} />
            <Route path="products" element={<AdminProductsPage />} />
          </Route>
          <Route path="*" element={<div className="container muted">ไม่พบหน้านี้</div>} />
        </Routes>
      </main>
    </>
  );
}
