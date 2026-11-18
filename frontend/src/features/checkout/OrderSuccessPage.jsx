import { Link, useLocation, useParams } from 'react-router-dom';
import { baht, formatAddress } from '../../lib/format';

export default function OrderSuccessPage() {
  const { orderNo } = useParams();
  const order = useLocation().state?.order;

  return (
    <div className="container narrow">
      <div className="card success">
        <div className="success-icon">🌵</div>
        <h1>สั่งซื้อสำเร็จ</h1>
        <p>
          เลขที่คำสั่งซื้อ <strong className="order-no">{orderNo}</strong>
        </p>
        <p className="muted">เก็บเลขนี้ไว้ใช้ติดตามสถานะ (คู่กับเบอร์โทรที่ใช้สั่ง)</p>

        {order && (
          <div className="success-detail">
            {order.items.map((i) => (
              <div key={i.productId} className="summary-line">
                <span>
                  {i.name} × {i.qty}
                </span>
                <span>{baht(i.price * i.qty)}</span>
              </div>
            ))}
            <div className="summary-line total">
              <span>รวม</span>
              <strong>{baht(order.total)}</strong>
            </div>
            <p className="small">
              จัดส่งถึง {order.customer.name} ({order.customer.phone})
              <br />
              {formatAddress(order.address)}
            </p>
          </div>
        )}

        <div className="actions center">
          <Link to={`/track?order=${orderNo}`} className="btn btn-outline">
            ติดตามคำสั่งซื้อ
          </Link>
          <Link to="/" className="btn btn-primary">
            กลับหน้าร้าน
          </Link>
        </div>
      </div>
    </div>
  );
}
