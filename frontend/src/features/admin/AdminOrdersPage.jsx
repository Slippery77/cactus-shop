import { Fragment, useCallback, useEffect, useState } from 'react';
import { api, openEvents } from '../../lib/api';
import { baht, dateTime, formatAddress, ORDER_STATUS } from '../../lib/format';
import { useToast } from '../../components/Toast';

export default function AdminOrdersPage() {
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('');
  const [openId, setOpenId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [highlight, setHighlight] = useState(new Set());

  const reload = useCallback(async () => {
    try {
      const fresh = await api('/admin/orders');
      // ตัวที่ updatedAt ใหม่กว่าชนะ (กันกรณี realtime event มาถึงก่อนผลโหลด)
      setOrders((prev) => {
        const prevById = new Map(prev.map((o) => [o.id, o]));
        const merged = fresh.map((o) => {
          const cur = prevById.get(o.id);
          return cur && cur.updatedAt > o.updatedAt ? cur : o;
        });
        const freshIds = new Set(fresh.map((o) => o.id));
        return [...prev.filter((o) => !freshIds.has(o.id)), ...merged];
      });
    } catch {
      toast('โหลดคำสั่งซื้อไม่สำเร็จ', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    reload();
    // ออเดอร์ใหม่/เปลี่ยนสถานะ เข้ามาทันทีโดยไม่ต้อง refresh
    return openEvents('/admin/events', {
      ready: reload,
      'order.created': (o) => {
        setOrders((list) => (list.some((x) => x.id === o.id) ? list : [o, ...list]));
        setHighlight((s) => new Set(s).add(o.id));
        toast(`ออเดอร์ใหม่ ${o.orderNo}`);
      },
      'order.updated': (o) => setOrders((list) => list.map((x) => (x.id === o.id ? o : x))),
    });
  }, [reload, toast]);

  const changeStatus = async (order, status) => {
    if (status === 'cancelled' && !confirm(`ยกเลิกออเดอร์ ${order.orderNo}? ระบบจะคืนสต็อกให้อัตโนมัติ`)) return;
    try {
      const updated = await api(`/admin/orders/${order.id}/status`, { method: 'PATCH', body: { status } });
      setOrders((list) => list.map((x) => (x.id === updated.id ? updated : x)));
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const shown = filter ? orders.filter((o) => o.status === filter) : orders;
  const counts = orders.reduce((m, o) => ({ ...m, [o.status]: (m[o.status] || 0) + 1 }), {});

  return (
    <>
      <div className="row-between">
        <h1>คำสั่งซื้อ</h1>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="select-sm">
          <option value="">ทั้งหมด ({orders.length})</option>
          {Object.entries(ORDER_STATUS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label} ({counts[k] || 0})
            </option>
          ))}
        </select>
      </div>

      {loading && <p className="muted">กำลังโหลด...</p>}
      {!loading && shown.length === 0 && <p className="muted">ยังไม่มีคำสั่งซื้อ</p>}

      {shown.length > 0 && (
        <div className="card table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>เลขที่</th>
                <th>ลูกค้า</th>
                <th>เวลา</th>
                <th className="num">ยอดรวม</th>
                <th>สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((o) => (
                <Fragment key={o.id}>
                  <tr
                    className={`clickable ${highlight.has(o.id) ? 'row-new' : ''}`}
                    onClick={() => {
                      setOpenId(openId === o.id ? null : o.id);
                      setHighlight((s) => {
                        const n = new Set(s);
                        n.delete(o.id);
                        return n;
                      });
                    }}
                  >
                    <td>
                      <strong>{o.orderNo}</strong>
                    </td>
                    <td>
                      {o.customer.name}
                      <div className="muted small">{o.customer.phone}</div>
                    </td>
                    <td className="small">{dateTime(o.createdAt)}</td>
                    <td className="num">{baht(o.total)}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {o.status === 'cancelled' ? (
                        <span className="pill pill-gray">ยกเลิก</span>
                      ) : (
                        <select value={o.status} onChange={(e) => changeStatus(o, e.target.value)} className={`select-sm pill-${ORDER_STATUS[o.status].tone}`}>
                          {Object.entries(ORDER_STATUS).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                  </tr>
                  {openId === o.id && (
                    <tr className="detail-row">
                      <td colSpan={5}>
                        <div className="order-detail">
                          <div>
                            <h3>ที่อยู่จัดส่ง</h3>
                            <p>
                              {o.customer.name} · {o.customer.phone}
                              <br />
                              {formatAddress(o.address)}
                            </p>
                            {o.note && (
                              <p>
                                <strong>หมายเหตุ:</strong> {o.note}
                              </p>
                            )}
                          </div>
                          <div>
                            <h3>รายการสินค้า</h3>
                            {o.items.map((i) => (
                              <div key={i.productId} className="summary-line">
                                <span>
                                  {i.name} × {i.qty}
                                </span>
                                <span>{baht(i.price * i.qty)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
