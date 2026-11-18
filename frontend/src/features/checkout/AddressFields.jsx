import { useThaiAddress } from './useThaiAddress';

/** ช่องกรอกที่อยู่ เลือกจังหวัด → อำเภอ → ตำบล แล้วเติมรหัสไปรษณีย์ให้อัตโนมัติ */
export default function AddressFields({ value, onChange, errors }) {
  const { data, error } = useThaiAddress();
  const set = (patch) => onChange({ ...value, ...patch });

  const province = data?.find(([name]) => name === value.province);
  const districts = province?.[1] || [];
  const district = districts.find(([name]) => name === value.district);
  const subDistricts = district?.[1] || [];

  const field = (name, label, props = {}) => (
    <label className={`field ${errors[name] ? 'has-error' : ''}`}>
      <span>{label}</span>
      <input value={value[name]} onChange={(e) => set({ [name]: e.target.value })} {...props} />
      {errors[name] && <small>{errors[name]}</small>}
    </label>
  );

  const select = (name, label, options, onPick, disabled) => (
    <label className={`field ${errors[name] ? 'has-error' : ''}`}>
      <span>{label}</span>
      <select value={value[name]} onChange={(e) => onPick(e.target.value)} disabled={disabled}>
        <option value="">{disabled ? '—' : `เลือก${label}`}</option>
        {options.map(([name]) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
      {errors[name] && <small>{errors[name]}</small>}
    </label>
  );

  return (
    <div className="form-grid">
      {field('houseNo', 'บ้านเลขที่ *', { placeholder: 'เช่น 99/1' })}
      {field('moo', 'หมู่', { placeholder: 'เช่น 4', inputMode: 'numeric' })}
      <div className="span-2">{field('street', 'ถนน / ซอย / หมู่บ้าน', { placeholder: 'ไม่บังคับ' })}</div>

      {error && <p className="span-2 text-danger">โหลดรายชื่อจังหวัดไม่สำเร็จ กรุณารีเฟรชหน้า</p>}
      {select('province', 'จังหวัด *', data || [], (v) => set({ province: v, district: '', subDistrict: '', zipCode: '' }), !data)}
      {select('district', 'อำเภอ/เขต *', districts, (v) => set({ district: v, subDistrict: '', zipCode: '' }), !province)}
      {select(
        'subDistrict',
        'ตำบล/แขวง *',
        subDistricts,
        (v) => set({ subDistrict: v, zipCode: subDistricts.find(([n]) => n === v)?.[1] || '' }),
        !district,
      )}
      {field('zipCode', 'รหัสไปรษณีย์ *', { inputMode: 'numeric', maxLength: 5, placeholder: 'เติมให้อัตโนมัติ' })}
    </div>
  );
}
