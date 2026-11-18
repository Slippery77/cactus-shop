import { useEffect, useState } from 'react';
import { baht } from '../../lib/format';
import { useShopData } from '../products/ShopDataContext';
import { api } from '../../lib/api';
import { useToast } from '../../components/Toast';
import CactusImage from '../products/CactusImage';

const emptyForm = { name: '', categoryId: '', price: '', stock: '', description: '', imageUrl: '' };

function ProductForm({ initial, categories, onSave, onCancel }) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave({ ...form, price: Number(form.price), stock: Number(form.stock) });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <form className="card modal" onSubmit={submit} onClick={(e) => e.stopPropagation()}>
        <h2>{initial.id ? 'แก้ไขสินค้า' : 'เพิ่มสินค้า'}</h2>
        <div className="form-grid">
          <label className="field span-2">
            <span>ชื่อสินค้า *</span>
            <input value={form.name} onChange={set('name')} required />
          </label>
          <label className="field">
            <span>หมวดหมู่ *</span>
            <select value={form.categoryId} onChange={set('categoryId')} required>
              <option value="">เลือกหมวดหมู่</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>ราคา (บาท) *</span>
            <input type="number" min="0" step="any" value={form.price} onChange={set('price')} required />
          </label>
          <label className="field">
            <span>สต็อก *</span>
            <input type="number" min="0" step="1" value={form.stock} onChange={set('stock')} required />
          </label>
          <label className="field">
            <span>URL รูปภาพ</span>
            <input type="url" value={form.imageUrl} onChange={set('imageUrl')} placeholder="ว่างได้" />
          </label>
          <label className="field span-2">
            <span>รายละเอียด</span>
            <textarea rows={3} value={form.description} onChange={set('description')} />
          </label>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            ยกเลิก
          </button>
          <button className="btn btn-primary" disabled={saving}>
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      </form>
    </div>
  );
}

/** ช่องแก้สต็อกในตาราง กด Enter หรือออกจากช่องเพื่อบันทึก */
function StockInput({ product, onSave }) {
  const [value, setValue] = useState(String(product.stock));
  useEffect(() => setValue(String(product.stock)), [product.stock]); // ค่าเปลี่ยนจาก realtime

  const commit = () => {
    const n = Number(value);
    if (value === '' || !Number.isInteger(n) || n < 0) return setValue(String(product.stock));
    if (n !== product.stock) onSave(n);
  };

  return (
    <input
      className={`stock-input ${product.stock === 0 ? 'is-zero' : ''}`}
      type="number"
      min="0"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
    />
  );
}

export default function AdminProductsPage() {
  const { products, categories, categoryById } = useShopData();
  const toast = useToast();
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState('');

  // ไม่ต้อง setState เอง หลังบันทึก backend จะส่ง event product.updated มา แล้ว ShopData อัปเดตให้ทุกหน้า
  const save = async (form) => {
    const { id, createdAt, updatedAt, ...body } = form;
    await api(id ? `/admin/products/${id}` : '/admin/products', { method: id ? 'PATCH' : 'POST', body });
    toast(id ? 'บันทึกแล้ว' : 'เพิ่มสินค้าแล้ว');
    setEditing(null);
  };

  const saveStock = async (product, stock) => {
    try {
      await api(`/admin/products/${product.id}`, { method: 'PATCH', body: { stock } });
      toast(`อัปเดตสต็อก ${product.name} = ${stock}`);
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const remove = async (product) => {
    if (!confirm(`ลบ "${product.name}"?`)) return;
    try {
      await api(`/admin/products/${product.id}`, { method: 'DELETE' });
      toast('ลบสินค้าแล้ว');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const shown = filter ? products.filter((p) => p.categoryId === filter) : products;

  return (
    <>
      <div className="row-between">
        <h1>สินค้า / สต็อก</h1>
        <div className="row-gap">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="select-sm">
            <option value="">ทุกหมวด</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button className="btn btn-primary btn-sm" onClick={() => setEditing(emptyForm)}>
            + เพิ่มสินค้า
          </button>
        </div>
      </div>

      <div className="card table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th />
              <th>สินค้า</th>
              <th>หมวด</th>
              <th className="num">ราคา</th>
              <th className="num">สต็อก</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {shown.map((p) => (
              <tr key={p.id}>
                <td className="thumb">
                  <CactusImage product={p} />
                </td>
                <td>
                  <strong>{p.name}</strong>
                  {p.stock === 0 && <span className="badge badge-out">หมด</span>}
                </td>
                <td>{categoryById.get(p.categoryId)?.name}</td>
                <td className="num">{baht(p.price)}</td>
                <td className="num">
                  <StockInput product={p} onSave={(n) => saveStock(p, n)} />
                </td>
                <td className="num nowrap">
                  <button className="btn btn-sm btn-ghost" onClick={() => setEditing({ ...emptyForm, ...p })}>
                    แก้ไข
                  </button>
                  <button className="btn btn-sm btn-ghost text-danger" onClick={() => remove(p)}>
                    ลบ
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && <ProductForm initial={editing} categories={categories} onSave={save} onCancel={() => setEditing(null)} />}
    </>
  );
}
