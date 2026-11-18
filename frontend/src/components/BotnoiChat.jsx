// ปุ่มแชต Botnoi (Web chat) มุมขวาล่าง แสดงเฉพาะหน้าร้าน ซ่อนในหน้าหลังบ้าน
// เปลี่ยนบอทได้ที่ env: VITE_BOTNOI_BOT_ID, VITE_BOTNOI_BOT_LOGO (ตั้ง VITE_BOTNOI_BOT_ID=off เพื่อปิด)
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const BOT_ID = import.meta.env.VITE_BOTNOI_BOT_ID || '6afd5988100bd58a49b7c1e2';
const BOT_LOGO =
  import.meta.env.VITE_BOTNOI_BOT_LOGO ||
  'https://bn-sme-production-ap-southeast-1.s3.amazonaws.com/profile/baedb4a4-5bfa-41d4-838d-2b4534283a16.png';
const SDK_URL = 'https://console.botnoi.ai/customerchat/index.js';
const enabled = BOT_ID !== 'off';

let loaded = false;

/** ใส่ element + โหลด SDK ครั้งเดียวตามโค้ดฝังของ Botnoi */
function loadBotnoi() {
  if (loaded || !enabled) return;
  loaded = true;

  const root = document.createElement('div');
  root.id = 'bn-root';
  document.body.appendChild(root);

  const chat = document.createElement('div');
  chat.className = 'bn-customerchat';
  chat.setAttribute('bot_id', BOT_ID);
  chat.setAttribute('bot_logo', BOT_LOGO);
  document.body.appendChild(chat);

  const script = document.createElement('script');
  script.id = 'bn-jssdk';
  script.src = SDK_URL;
  script.async = true;
  // โค้ดต้นฉบับเรียก BN.init ตอน window.onload แต่ React โหลดหลัง onload ไปแล้ว จึงเรียกตอนสคริปต์โหลดเสร็จแทน
  script.onload = () => window.BN?.init({ version: '1.0' });
  document.head.appendChild(script);
}

export default function BotnoiChat() {
  const { pathname } = useLocation();
  const hidden = pathname.startsWith('/admin');

  useEffect(() => {
    loadBotnoi();
  }, []);

  useEffect(() => {
    document.body.classList.toggle('hide-botnoi', hidden);
  }, [hidden]);

  return null;
}
