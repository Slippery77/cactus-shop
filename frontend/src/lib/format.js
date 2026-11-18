export const baht = (n) =>
  `฿${Number(n).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export const dateTime = (iso) =>
  new Date(iso).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });

export const ORDER_STATUS = {
  pending: { label: 'รอดำเนินการ', tone: 'amber' },
  shipping: { label: 'กำลังจัดส่ง', tone: 'blue' },
  completed: { label: 'สำเร็จ', tone: 'green' },
  cancelled: { label: 'ยกเลิก', tone: 'gray' },
};

export function formatAddress(a) {
  return [
    `${a.houseNo}`,
    a.moo && `หมู่ ${a.moo}`,
    a.street,
    `ต.${a.subDistrict}`,
    `อ.${a.district}`,
    `จ.${a.province}`,
    a.zipCode,
  ]
    .filter(Boolean)
    .join(' ');
}
