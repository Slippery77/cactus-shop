// ถ้าสินค้าไม่มีรูป ให้วาดภาพประกอบตามหมวดหมู่แทน (ไม่ต้องพึ่งรูปจากข้างนอก)
const MOON_COLORS = { ชมพู: '#f472b6', ส้ม: '#fb923c', เหลือง: '#facc15', แดง: '#ef4444' };

function moonColor(name) {
  const hit = Object.keys(MOON_COLORS).find((k) => name.includes(k));
  return hit ? MOON_COLORS[hit] : '#f472b6';
}

function Illustration({ product }) {
  const pot = (
    <g>
      <path d="M58 150 h84 l-8 40 h-68 z" fill="#c2703d" />
      <rect x="52" y="142" width="96" height="14" rx="4" fill="#d9844c" />
    </g>
  );

  if (product.categoryId === 'moon-cactus') {
    return (
      <svg viewBox="0 0 200 200" aria-hidden="true">
        <rect x="88" y="95" width="24" height="52" rx="6" fill="#4d7c4a" />
        <circle cx="100" cy="78" r="34" fill={moonColor(product.name)} />
        <path d="M72 72 q28 -22 56 0 M70 86 q30 -18 60 0" stroke="#0002" strokeWidth="3" fill="none" />
        {pot}
      </svg>
    );
  }
  if (product.categoryId === 'mammillaria') {
    return (
      <svg viewBox="0 0 200 200" aria-hidden="true">
        <ellipse cx="100" cy="108" rx="42" ry="38" fill="#7fa36b" />
        {Array.from({ length: 22 }).map((_, i) => (
          <circle key={i} cx={66 + ((i * 37) % 70)} cy={80 + ((i * 23) % 56)} r="3.2" fill="#fff" opacity=".85" />
        ))}
        {[0, 1, 2, 3, 4].map((i) => (
          <circle key={i} cx={74 + i * 13} cy={74 - (i % 2) * 4} r="5" fill="#f9a8d4" />
        ))}
        {pot}
      </svg>
    );
  }
  // astrophytum (ค่าเริ่มต้น)
  return (
    <svg viewBox="0 0 200 200" aria-hidden="true">
      <ellipse cx="100" cy="112" rx="46" ry="34" fill="#5f7f5a" />
      {[-30, -15, 0, 15, 30].map((dx) => (
        <path key={dx} d={`M${100 + dx * 0.4} 80 Q${100 + dx} 112 ${100 + dx * 1.3} 144`} stroke="#4a6646" strokeWidth="3" fill="none" />
      ))}
      {Array.from({ length: 26 }).map((_, i) => (
        <circle key={i} cx={64 + ((i * 41) % 74)} cy={88 + ((i * 29) % 46)} r="2.4" fill="#f5f5f4" />
      ))}
      <circle cx="100" cy="80" r="7" fill="#fde047" />
      {pot}
    </svg>
  );
}

export default function CactusImage({ product }) {
  return (
    <div className="cactus-img">
      {product.imageUrl ? <img src={product.imageUrl} alt={product.name} loading="lazy" /> : <Illustration product={product} />}
    </div>
  );
}
