import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import { baht, dateTime, ORDER_STATUS } from '../../lib/format';

export default function TrackOrderPage() {
  const [params] = useSearchParams();
  const [orderNo, setOrderNo] = useState(params.get('order') || '');
  const [phone, setPhone] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const search = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const no = encodeURIComponent(orderNo.trim().toUpperCase());
      setResult(await api(`/orders/${no}?phone=${encodeURIComponent(phone)}`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
    } finally {
      setLoading(false);
    }
  };

  const st = result && ORDER_STATUS[result.status];

  return (
    <div className="container narrow">
      <h1>ติดตามคำสั่งซื้อ</h1>
      <form className="card form-grid" onSubmit={search}>
        <label className="field">
          <span>เลขที่คำสั่งซื้อ</span>
          <input value={orderNo} onChange={(e) => setOrderNo(e.target.value)} placeholder="CT261118-0001" required />
        </label>
        <label className="field">
          <span>เบอร์โทรที่ใช้สั่ง</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" required />
        </label>
        <button className="btn btn-primary span-2" disabled={loading}>
          {loading ? 'กำลังค้นหา...' : 'ค้นหา'}
        </button>
      </form>

      {error && <div className="alert alert-error">{error}</div>}
      {result && (
        <div className="card">
          <div className="row-between">
            <strong>{result.orderNo}</strong>
            <span className={`pill pill-${st.tone}`}>{st.label}</span>
          </div>
          <p className="muted small">สั่งเมื่อ {dateTime(result.createdAt)}</p>
          {result.items.map((i) => (
            <div key={i.productId} className="summary-line">
              <span>
                {i.name} × {i.qty}
              </span>
              <span>{baht(i.price * i.qty)}</span>
            </div>
          ))}
          <div className="summary-line total">
            <span>รวม</span>
            <strong>{baht(result.total)}</strong>
          </div>
        </div>
      )}
    </div>
  );
}
