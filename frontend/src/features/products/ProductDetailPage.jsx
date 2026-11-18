import { Link, useParams } from 'react-router-dom';
import { baht } from '../../lib/format';
import { useShopData } from './ShopDataContext';
import CactusImage, { ImageCredit } from './CactusImage';
import { BuyButtons, StockBadge } from './ProductCard';
import { useCart } from '../cart/CartContext';

export default function ProductDetailPage() {
  const { id } = useParams();
  const { productById, categoryById, status } = useShopData();
  const { qtyInCart } = useCart();
  const product = productById.get(id);

  if (status === 'loading') return <div className="container muted">กำลังโหลด...</div>;
  if (!product)
    return (
      <div className="container">
        <p>ไม่พบสินค้านี้</p>
        <Link to="/">← กลับหน้าร้าน</Link>
      </div>
    );

  const category = categoryById.get(product.categoryId);
  const inCart = qtyInCart(product.id);

  return (
    <div className="container">
      <Link to={`/?category=${product.categoryId}`} className="back-link">
        ← {category?.name || 'กลับหน้าร้าน'}
      </Link>
      <div className="detail">
        <div>
          <div className="card detail-image">
            <CactusImage product={product} />
          </div>
          <ImageCredit product={product} />
        </div>
        <div className="detail-info">
          <span className="product-cat">{category?.name}</span>
          <h1>{product.name}</h1>
          <p className="price price-lg">{baht(product.price)}</p>
          <StockBadge stock={product.stock} />
          {product.description && <p className="detail-desc">{product.description}</p>}
          {inCart > 0 && <p className="muted">มีในตะกร้าแล้ว {inCart} ชิ้น</p>}
          <BuyButtons product={product} />
        </div>
      </div>
    </div>
  );
}
