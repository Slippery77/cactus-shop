# 🌵 Cactus Shop

เว็บแอปสั่งซื้อกระบองเพชร (ไม่มีระบบ login เปิดเว็บแล้วเจอรายการต้นไม้เลย) แบ่งตามหมวด (Astrophytum, Mammillaria, Moon Cactus) มีตะกร้าสินค้า ฟอร์มที่อยู่จัดส่งแยกช่อง และหลังบ้านที่ข้อมูลอัปเดตแบบ realtime ยังไม่มีระบบชำระเงิน

```
cactus-shop/
├── backend/    Express API + Server-Sent Events + Swagger docs (เก็บข้อมูลเป็น JSON file)
└── frontend/   React + Vite (โครงสร้างแบบ feature-based)
```

## ฟีเจอร์

**หน้าบ้าน**
- รายการสินค้า กรองตามหมวด และหน้ารายละเอียดสินค้า
- ใส่ตะกร้าและสั่งซื้อเลยได้ จำนวนในตะกร้าใส่เกินสต็อกไม่ได้ ตะกร้าเก็บไว้ใน localStorage
- สินค้าหมด (stock = 0) จะกดใส่ตะกร้าหรือสั่งซื้อไม่ได้
- ถ้าสินค้าหมดหรือสต็อกลดลงระหว่างที่อยู่ในตะกร้า จะขึ้นเตือนทันทีและบล็อกการสั่งซื้อ มีปุ่มให้ปรับจำนวนตามสต็อก
- ฟอร์มที่อยู่: ชื่อ, เบอร์โทร, บ้านเลขที่, หมู่, ถนน/ซอย, จังหวัด → อำเภอ → ตำบล (dropdown เลือกต่อกัน) และรหัสไปรษณีย์ที่เติมให้อัตโนมัติ
- หน้าติดตามคำสั่งซื้อ (ใช้เลขออเดอร์คู่กับเบอร์โทร)

**หลังบ้าน (`/admin`)**
- เข้าได้ทันทีที่ `/admin` ไม่ต้อง login
- จัดการสินค้า: เพิ่ม/แก้ไข/ลบ และแก้สต็อกในตารางได้ทันที
- ดูคำสั่งซื้อ (กดแถวเพื่อดูที่อยู่และรายการ) และเปลี่ยนสถานะ: รอดำเนินการ / กำลังจัดส่ง / สำเร็จ / ยกเลิก ถ้ายกเลิก ระบบจะคืนสต็อกให้อัตโนมัติ

**Realtime:** ใช้ Server-Sent Events เมื่อแก้สต็อก สั่งซื้อ หรือยกเลิกออเดอร์ ทุกหน้าที่เปิดอยู่จะอัปเดตทันที และ admin จะเห็นออเดอร์ใหม่เด้งขึ้นมาเองโดยไม่ต้อง refresh

**ตัดสต็อกแบบ atomic:** เช็กทุกรายการก่อนตัด ถ้ามีรายการไหนไม่พอจะไม่ตัดเลยและตอบ 409 ทดสอบโดยยิงสั่งซื้อพร้อมกัน 20 request กับสินค้าที่เหลือ 2 ชิ้น สำเร็จแค่ 2 request พอดี

## วิธีรัน (ต้องมี Node.js 18 ขึ้นไป)

เปิด terminal 2 อัน

```bash
# terminal 1: backend → http://localhost:4000
cd backend
npm install
copy .env.example .env      # Windows (macOS/Linux ใช้ cp)
npm run dev
```

```bash
# terminal 2: frontend → http://localhost:5173
cd frontend
npm install
npm run dev
```

- หน้าร้าน: http://localhost:5173
- หลังบ้าน: http://localhost:5173/admin
- API docs (Swagger): http://localhost:4000/api-docs

ตอนรันครั้งแรก backend จะสร้าง `backend/data/db.json` พร้อมสินค้าตัวอย่าง 12 รายการ (บางรายการสต็อกเป็น 0 ไว้ทดสอบการบล็อก) ถ้าอยากล้างกลับเป็นข้อมูลตัวอย่าง ใช้ `npm run seed`

**ทดสอบ realtime:** เปิดหน้าร้านกับหน้า admin คนละแท็บ แล้วแก้สต็อกสินค้าเป็น 0 ในหลังบ้าน ปุ่มในหน้าร้านจะถูกบล็อกทันที

## API

ดูแบบละเอียดได้ที่ `/api-docs` (Swagger UI) หรือไฟล์ [`backend/src/openapi.yaml`](backend/src/openapi.yaml)

| Method | Path | ใช้ทำอะไร |
|---|---|---|
| GET | `/api/categories` | รายการหมวดหมู่ |
| GET | `/api/products?category=` | รายการสินค้า |
| GET | `/api/products/:id` | รายละเอียดสินค้า |
| POST | `/api/orders` | สร้างคำสั่งซื้อ + ตัดสต็อก |
| GET | `/api/orders/:orderNo?phone=` | เช็กสถานะออเดอร์ |
| GET | `/api/events` | SSE stream: `product.updated`, `product.deleted` |
| POST / PATCH / DELETE | `/api/admin/products[/:id]` | จัดการสินค้า/สต็อก |
| GET | `/api/admin/orders` | รายการคำสั่งซื้อ |
| PATCH | `/api/admin/orders/:id/status` | เปลี่ยนสถานะ (ยกเลิก = คืนสต็อก) |
| GET | `/api/admin/events` | SSE ของ admin: ได้ event สินค้า + `order.created`, `order.updated` |

### สำหรับต่อ chatbot (เช่น Botnoi)

**แนะนำ: ต่อผ่าน MCP** ที่ `POST /mcp` (Streamable HTTP, ไม่ต้อง login) AI Agent จะเรียกเครื่องมือเองตามบทสนทนา

| เครื่องมือ | ใช้ทำอะไร |
|---|---|
| `list_products` | ดูสินค้า ราคา สต็อกล่าสุด (กรองตามหมวดได้) และได้ `id` ไว้ใช้สั่งซื้อ |
| `track_order` | เช็กสถานะออเดอร์ ต้องใช้เลขออเดอร์ + เบอร์โทรที่ตรงกัน |
| `create_order` | สั่งซื้อ (หลายชนิดได้) ตัดสต็อกและแจ้ง realtime เหมือนสั่งจากหน้าเว็บ |

ใน Botnoi: MCP Tools → Add new connection → Add Custom MCP → ใส่ URL `https://<โดเมน backend>/mcp` แล้วเลือกใช้ใน AI Agent

ทดสอบเองได้ด้วย MCP Inspector: `npx @modelcontextprotocol/inspector` แล้วเลือก Streamable HTTP ใส่ URL `http://localhost:4000/mcp`

ไม่มีเครื่องมือฝั่ง admin ใน MCP แชตจึงแก้สต็อก ลบสินค้า หรือดูข้อมูลลูกค้าคนอื่นไม่ได้

**หรือเรียก REST ตรง ๆ** (เช่น API object ของ Botnoi)
- `GET /api/products?category=moon-cactus`
- `GET /api/orders/{orderNo}?phone=08xxxxxxxx`
- `POST /api/orders`

## Deploy

**Backend** (เช่น Render, Railway หรือ VPS)
- Root directory: `backend`, start command: `npm start`
- ตั้ง env: `CORS_ORIGIN=https://<โดเมนหน้าบ้าน>` (หรือ `*`)
- ⚠️ ข้อมูลเก็บเป็นไฟล์ `data/db.json` ถ้าโฮสต์ที่ disk ไม่ถาวร (เช่น Render free) ข้อมูลจะรีเซ็ตทุกครั้งที่ redeploy/restart ถ้าต้องการให้ข้อมูลอยู่ถาวร ให้ใช้ persistent disk แล้วตั้ง `DB_FILE` ชี้ไปที่ disk นั้น หรือเปลี่ยนไปใช้ PostgreSQL โดยแก้แค่ `backend/src/db.js` ไฟล์เดียว
- ใช้ instance เดียว (realtime และการตัดสต็อกพึ่ง process เดียว)

**Frontend** (เช่น Vercel หรือ Netlify)
- Root directory: `frontend`, build: `npm run build`, output: `dist`
- ตั้ง env: `VITE_API_URL=https://<โดเมน backend>`
- มี `vercel.json` และ `public/_redirects` ให้แล้ว รีเฟรชหน้าย่อยอย่าง `/admin` จะไม่ 404

---
รูปสินค้าตัวอย่างมาจาก [Wikimedia Commons](https://commons.wikimedia.org) (CC BY / CC BY-SA) เครดิตผู้ถ่ายแสดงอยู่ใต้รูปในหน้ารายละเอียดสินค้า

ข้อมูลจังหวัด/อำเภอ/ตำบล/รหัสไปรษณีย์: [kongvut/thai-province-data](https://github.com/kongvut/thai-province-data) (MIT License)
