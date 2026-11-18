import { fileURLToPath } from 'node:url';

export const seedCategories = [
  { id: 'astrophytum', name: 'Astrophytum', description: 'แอสโตร ทรงพู ลายจุดขาวสวย เลี้ยงง่าย' },
  { id: 'mammillaria', name: 'Mammillaria', description: 'แมมมิลลาเรีย ต้นเล็ก ออกดอกเป็นวงรอบหัว' },
  { id: 'moon-cactus', name: 'Moon Cactus', description: 'ยิมโนสีสด เสียบตอ สีชมพู ส้ม เหลือง แดง' },
];

// รูปสินค้าตัวอย่างมาจาก Wikimedia Commons (ใบอนุญาตเสรี ต้องใส่เครดิตผู้ถ่าย + สัญญาอนุญาต)
// commons(ชื่อไฟล์) → URL รูปขนาดกว้าง 640px, imageCredit → ข้อความเครดิต, imageSource → หน้าไฟล์ต้นทาง
const commonsFile = (file) => encodeURIComponent(file.replace(/ /g, '_'));
const photo = (file, credit) => ({
  imageUrl: `https://commons.wikimedia.org/wiki/Special:FilePath/${commonsFile(file)}?width=640`,
  imageCredit: credit,
  imageSource: `https://commons.wikimedia.org/wiki/File:${commonsFile(file)}`,
});

const p = (id, categoryId, name, description, price, stock, image) => ({
  id, categoryId, name, description, price, stock, ...image,
});

export const seedProducts = [
  p('astro-001', 'astrophytum', 'Astrophytum asterias (Super Kabuto)', 'ซุปเปอร์คาบูโตะ จุดขาวหนาแน่น ขนาด 3-4 ซม.', 350, 8,
    photo('Astrophytum asterias superkabuto.jpg', 'Wikimedia Commons · CC BY-SA 2.5')),
  p('astro-002', 'astrophytum', 'Astrophytum myriostigma', 'มายริโอ ทรงดาว 5 พู ขนาด 4 ซม.', 180, 12,
    photo('Astrophytum myriostigma - JBM.jpg', 'Montréalais · CC BY 3.0')),
  p('astro-003', 'astrophytum', 'Astrophytum ornatum', 'ออนาตั้ม หนามเหลือง ลายขาวเป็นแถบ', 220, 0,
    photo('Astrophytum ornatum.jpg', 'Stan Shebs · CC BY-SA 3.0')),
  p('astro-004', 'astrophytum', 'Astrophytum capricorne', 'คาปริคอร์น หนามบิดงอ ขนาด 5 ซม.', 260, 3,
    photo('Astrophytum capricorne v. minor (7738162546).jpg', 'Dornenwolf · CC BY 2.0')),
  p('mam-001', 'mammillaria', 'Mammillaria plumosa', 'แมมขนนก ขนขาวนุ่มคลุมทั้งต้น', 120, 15,
    photo('Mammillaria plumosa-1.jpg', 'Mr.Rosewater · CC BY-SA 3.0')),
  p('mam-002', 'mammillaria', 'Mammillaria elongata', 'แมมนิ้วทอง แตกกอเป็นนิ้ว ๆ', 90, 20,
    photo('Mammillaria elongata 1zz.jpg', 'David J. Stang · CC BY-SA 4.0')),
  p('mam-003', 'mammillaria', 'Mammillaria bocasana', 'แมมขนแมว ดอกชมพูอ่อน', 100, 0,
    photo('Mammillaria bocasana 01.jpg', 'Joe Mabel · CC BY-SA 3.0')),
  p('mam-004', 'mammillaria', 'Mammillaria hahniana', 'แมมขนแกะ ขนขาวยาว ดอกบานเป็นวง', 150, 6,
    photo('Mammillaria hahniana 9.jpg', 'Montgomery · CC BY 3.0')),
  p('moon-001', 'moon-cactus', 'Moon Cactus สีชมพู', 'ยิมโนด่างสีชมพู เสียบตอสามเหลี่ยม', 80, 25,
    photo('Moon Cactus Gymnocalycium Mihanovichii Variegata Pink Diamond.jpg', 'CactusManHere · CC BY-SA 4.0')),
  p('moon-002', 'moon-cactus', 'Moon Cactus สีส้ม', 'ยิมโนด่างสีส้มสด เสียบตอ', 80, 18,
    photo('Yellow Orange Red Moon Cactus Ooty Sep25 A7CR 07825.jpg', 'Timothy A. Gonsalves · CC BY-SA 4.0')),
  p('moon-003', 'moon-cactus', 'Moon Cactus สีเหลือง', 'ยิมโนด่างสีเหลือง เสียบตอ', 80, 0,
    photo('Yellow Moon Cactus Full Ooty Sep25 A7CR 07885.jpg', 'Timothy A. Gonsalves · CC BY-SA 4.0')),
  p('moon-004', 'moon-cactus', 'Moon Cactus สีแดง', 'ยิมโนด่างสีแดงเข้ม หายาก', 120, 2,
    photo('Gymnocalycium mihanovichii(red).jpg', 'Ahtk2000 · CC BY-SA 4.0')),
];

export function createSeedData() {
  const now = new Date().toISOString();
  return {
    categories: seedCategories,
    products: seedProducts.map((x) => ({ ...x, createdAt: now, updatedAt: now })),
    orders: [],
    counters: { order: 0 },
  };
}

// `npm run seed` → ล้างข้อมูลแล้วใส่ข้อมูลตัวอย่างใหม่
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { resetDb } = await import('./db.js');
  resetDb();
  console.log('Seeded data file with sample categories and products.');
}
