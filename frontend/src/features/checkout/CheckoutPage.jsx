import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import { baht } from '../../lib/format';
import { useCart } from '../cart/CartContext';
import AddressFields from './AddressFields';

const emptyAddress = { houseNo: '', moo: '', street: '', province: '', district: '', subDistrict: '', zipCode: '' };

function validate({ name, phone, address }) {
  const e = {};
  if (!name.trim()) e.name = 'กรุณากรอกชื่อผู้รับ';
  if (!/^0\d{8,9}$/.test(phone.replace(/[\s-]/g, ''))) e.phone = 'เบอร์โทรต้องขึ้นต้นด้วย 0 และมี 9-10 หลัก';
  if (!address.houseNo.trim()) e.houseNo = 'กรุณากรอกบ้านเลขที่';
  if (!address.province) e.province = 'กรุณาเลือกจังหวัด';
  if (!address.district) e.district = 'กรุณาเลือกอำเภอ/เขต';
  if (!address.subDistrict) e.subDistrict = 'กรุณาเลือกตำบล/แขวง';
  if (!/^\d{5}$/.test(address.zipCode)) e.zipCode = 'รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก';
  return e;
}

export default function CheckoutPage() {
  const cart = useCart();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState(emptyAddress);
  const [note, setNote] = useState('');
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  // แสดง error หลังกดยืนยันครั้งแรก แล้วตรวจใหม่ทุกครั้งที่พิมพ์ (error หายเองเมื่อกรอกถูก)
  const errors = triedSubmit ? validate({ name, phone, address }) : {};

  if (cart.lines.length === 0)
    return (
      <div className="container empty">
        <p>ยังไม่มีสินค้าในตะกร้า</p>
        <Link to="/" className="btn btn-primary">
          เลือกซื้อสินค้า
        </Link>
      </div>
    );

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate({ name, phone, address });
    setTriedSubmit(true);
    setSubmitError(null);
    if (Object.keys(errs).length || cart.hasProblem) return;

    setSubmitting(true);
    try {
      const order = await api('/orders', {
        method: 'POST',
        body: {
          customer: { name, phone },
          address,
          note,
          items: cart.lines.map((l) => ({ productId: l.productId, qty: l.qty })),
        },
      });
      cart.clear();
      navigate(`/order-success/${order.orderNo}`, { state: { order } });
    } catch (err) {
      // 409 = มีคนซื้อตัดหน้า สต็อกไม่พอแล้ว (ตะกร้าจะขึ้นเตือนเองจาก realtime)
      setSubmitError(err instanceof ApiError ? err.message : 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ลองใหม่อีกครั้ง');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container">
      <h1>สั่งซื้อสินค้า</h1>
      <form className="checkout" onSubmit={submit} noValidate>
        <div className="card">
          <h2>ข้อมูลผู้รับ</h2>
          <div className="form-grid">
            <label className={`field ${errors.name ? 'has-error' : ''}`}>
              <span>ชื่อ-นามสกุลผู้รับ *</span>
              <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
              {errors.name && <small>{errors.name}</small>}
            </label>
            <label className={`field ${errors.phone ? 'has-error' : ''}`}>
              <span>เบอร์โทร *</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="08xxxxxxxx" />
              {errors.phone && <small>{errors.phone}</small>}
            </label>
          </div>

          <h2>ที่อยู่จัดส่ง</h2>
          <AddressFields value={address} onChange={setAddress} errors={errors} />

          <label className="field">
            <span>หมายเหตุถึงร้าน</span>
            <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="ไม่บังคับ" />
          </label>
        </div>

        <aside className="card summary">
          <h2>สรุปคำสั่งซื้อ</h2>
          {cart.lines.map((l) => (
            <div key={l.productId} className="summary-line">
              <span>
                {l.product?.name || 'สินค้าที่ถูกลบ'} × {l.qty}
                {l.problem && <small className="text-danger"> · {l.problem}</small>}
              </span>
              <span>{l.product ? baht(l.product.price * l.qty) : '-'}</span>
            </div>
          ))}
          <div className="summary-line total">
            <span>รวม</span>
            <strong className="price">{baht(cart.total)}</strong>
          </div>
          <p className="muted small">ยังไม่มีการชำระเงินในระบบนี้ ร้านจะติดต่อกลับเพื่อยืนยันออเดอร์</p>

          {cart.hasProblem && (
            <div className="alert alert-warn">
              สต็อกบางรายการไม่พอ{' '}
              <button type="button" className="btn btn-sm btn-outline" onClick={cart.fixToStock}>
                ปรับตามสต็อก
              </button>
            </div>
          )}
          {submitError && <div className="alert alert-error">{submitError}</div>}

          <button className="btn btn-primary btn-block" disabled={submitting || cart.hasProblem}>
            {submitting ? 'กำลังส่งคำสั่งซื้อ...' : 'ยืนยันคำสั่งซื้อ'}
          </button>
          <Link to="/cart" className="btn btn-ghost btn-block">
            แก้ไขตะกร้า
          </Link>
        </aside>
      </form>
    </div>
  );
}
