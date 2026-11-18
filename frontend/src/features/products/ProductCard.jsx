import { Link, useNavigate } from 'react-router-dom';
import { baht } from '../../lib/format';
import { useCart } from '../cart/CartContext';
import CactusImage from './CactusImage';
import { useToast } from '../../components/Toast';

export function StockBadge({ stock }) {
  if (stock === 0) return <span className="badge badge-out">สินค้าหมด</span>;
  if (stock <= 3) return <span className="badge badge-low">เหลือ {stock} ชิ้น</span>;
  return <span className="badge badge-in">มี {stock} ชิ้น</span>;
}

/** ปุ่มใส่ตะกร้า / สั่งซื้อเลย ใช้ร่วมกันทั้งการ์ดและหน้ารายละเอียด */
export function BuyButtons({ product, qty = 1 }) {
  const cart = useCart();
  const toast = useToast();
  const navigate = useNavigate();
  const soldOut = product.stock === 0;
  const full = cart.qtyInCart(product.id) >= product.stock;
  const disabled = soldOut || full;

  const addToCart = () => {
    if (cart.add(product.id, qty)) toast(`เพิ่ม ${product.name} ลงตะกร้าแล้ว`);
  };
  const buyNow = () => {
    if (cart.qtyInCart(product.id) === 0) cart.add(product.id, qty);
    navigate('/checkout');
  };

  return (
    <div className="buy-buttons">
      <button className="btn btn-outline" onClick={addToCart} disabled={disabled}>
        {soldOut ? 'สินค้าหมด' : full ? 'ครบจำนวนในสต็อก' : 'ใส่ตะกร้า'}
      </button>
      <button className="btn btn-primary" onClick={buyNow} disabled={soldOut}>
        สั่งซื้อเลย
      </button>
    </div>
  );
}

export default function ProductCard({ product, category }) {
  return (
    <article className={`card product-card ${product.stock === 0 ? 'is-out' : ''}`}>
      <Link to={`/products/${product.id}`} className="product-card-link">
        <CactusImage product={product} />
        <div className="product-card-body">
          <span className="product-cat">{category?.name}</span>
          <h3>{product.name}</h3>
          <div className="product-meta">
            <strong className="price">{baht(product.price)}</strong>
            <StockBadge stock={product.stock} />
          </div>
        </div>
      </Link>
      <BuyButtons product={product} />
    </article>
  );
}
