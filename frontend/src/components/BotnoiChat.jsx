// กล่องแชตกับบอท Botnoi (ทำเอง ไม่ใช้ iframe ของ Botnoi)
// ส่งข้อความผ่าน backend (/api/chat/send) แล้วรับคำตอบแบบ realtime (/api/chat/events)
// ซ่อนในหน้าหลังบ้าน, จำประวัติแชตไว้ใน localStorage
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api, API_URL } from '../lib/api';

const BOT_NAME = 'น้องแคคตัส';
const BOT_LOGO =
  import.meta.env.VITE_BOTNOI_BOT_LOGO ||
  'https://bn-sme-production-ap-southeast-1.s3.amazonaws.com/profile/baedb4a4-5bfa-41d4-838d-2b4534283a16.png';
const enabled = import.meta.env.VITE_CHAT !== 'off';
const REPLY_TIMEOUT_MS = 30000;
const STORE_KEY = 'cactus-chat';

const GREETING = {
  from: 'bot',
  type: 'text',
  text: 'สวัสดีครับ 🌵 ถามเรื่องต้นไม้ ราคา สต็อก สั่งซื้อ หรือติดตามออเดอร์ได้เลยครับ',
};
const STARTERS = ['แนะนำต้นไม้สำหรับมือใหม่', 'Moon Cactus ราคาเท่าไหร่', 'ติดตามออเดอร์'];

function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY));
    if (s?.sessionId) return s;
  } catch {
    /* ignore */
  }
  const id = crypto.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  return { sessionId: id, messages: [] };
}

export default function BotnoiChat() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState(loadState);
  const [text, setText] = useState('');
  const [waiting, setWaiting] = useState(false);
  const [notice, setNotice] = useState(null);
  const listRef = useRef(null);
  const timeoutRef = useRef(null);
  const esRef = useRef(null);

  const { sessionId, messages } = state;

  useEffect(() => {
    localStorage.setItem(STORE_KEY, JSON.stringify({ sessionId, messages: messages.slice(-50) }));
  }, [sessionId, messages]);

  const append = useCallback((items) => setState((s) => ({ ...s, messages: [...s.messages, ...items] })), []);

  // ต่อ SSE ครั้งแรกที่เปิดกล่องแชต แล้วเปิดค้างไว้
  useEffect(() => {
    if (!open || esRef.current) return;
    const es = new EventSource(`${API_URL}/api/chat/events?sessionId=${encodeURIComponent(sessionId)}`);
    esRef.current = es;
    es.addEventListener('bot', (e) => {
      try {
        const { messages: incoming } = JSON.parse(e.data);
        append(incoming.map((m) => ({ ...m, from: 'bot' })));
        setWaiting(false);
        setNotice(null);
        clearTimeout(timeoutRef.current);
      } catch {
        /* ignore */
      }
    });
    // ไม่ปิดตอนพับกล่อง คำตอบที่มาระหว่างนั้นจะได้ไม่หาย
  }, [open, sessionId, append]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, waiting, open]);

  const send = async (raw) => {
    const value = raw.trim();
    if (!value) return;
    setText('');
    setNotice(null);
    append([{ from: 'me', type: 'text', text: value }]);
    setWaiting(true);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setWaiting(false);
      setNotice('บอทยังไม่ตอบ ลองส่งใหม่อีกครั้งนะครับ');
    }, REPLY_TIMEOUT_MS);
    try {
      await api('/chat/send', { method: 'POST', body: { sessionId, text: value } });
    } catch (err) {
      clearTimeout(timeoutRef.current);
      setWaiting(false);
      setNotice(err.message || 'ส่งข้อความไม่สำเร็จ');
    }
  };

  // เริ่มห้องแชตใหม่ (session ใหม่ ประวัติเดิมหาย)
  const reset = () => {
    esRef.current?.close();
    esRef.current = null;
    clearTimeout(timeoutRef.current);
    localStorage.removeItem(STORE_KEY);
    setState(loadState());
    setNotice(null);
    setWaiting(false);
  };

  if (!enabled || pathname.startsWith('/admin')) return null;

  const shown = [GREETING, ...messages];
  // ปุ่มตัวเลือก: ตอนเริ่มใช้ตัวอย่างคำถาม, หลังจากนั้นใช้ตัวเลือกที่บอทส่งมาหลังข้อความล่าสุดของเรา
  const lastMine = messages.map((m) => m.from).lastIndexOf('me');
  const options =
    messages.length === 0 ? STARTERS : messages.slice(lastMine + 1).filter((m) => m.type === 'option').map((m) => m.text);

  return (
    <div className="chat">
      {open && (
        <section className="chat-panel" aria-label={`แชตกับ ${BOT_NAME}`}>
          <header className="chat-head">
            <span className="chat-avatar" aria-hidden="true">
              🌵
              <img src={BOT_LOGO} alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />
            </span>
            <div>
              <strong>{BOT_NAME}</strong>
              <span className="chat-sub">ผู้ช่วยร้าน Cactus Shop</span>
            </div>
            <button className="chat-icon" onClick={reset} title="เริ่มแชตใหม่" aria-label="เริ่มแชตใหม่">
              ↺
            </button>
            <button className="chat-icon" onClick={() => setOpen(false)} aria-label="ปิดแชต">
              ✕
            </button>
          </header>

          <div className="chat-list" ref={listRef}>
            {shown
              .filter((m) => m.type !== 'option')
              .map((m, i) => (
                <div key={i} className={`chat-msg ${m.from === 'me' ? 'me' : 'bot'}`}>
                  {m.type === 'image' ? <img src={m.url} alt="" /> : m.text}
                </div>
              ))}
            {waiting && (
              <div className="chat-msg bot typing" aria-label="บอทกำลังพิมพ์">
                <span />
                <span />
                <span />
              </div>
            )}
            {notice && <div className="chat-notice">{notice}</div>}
          </div>

          {options.length > 0 && !waiting && (
            <div className="chat-options">
              {options.map((o) => (
                <button key={o} onClick={() => send(o)}>
                  {o}
                </button>
              ))}
            </div>
          )}

          <form
            className="chat-input"
            onSubmit={(e) => {
              e.preventDefault();
              send(text);
            }}
          >
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="พิมพ์ข้อความ..." maxLength={1000} aria-label="ข้อความ" />
            <button disabled={!text.trim()} aria-label="ส่ง">
              ➤
            </button>
          </form>
        </section>
      )}
      <button className="chat-launcher" onClick={() => setOpen((v) => !v)} aria-label={open ? 'ปิดแชต' : 'แชตกับร้าน'} aria-expanded={open}>
        <span aria-hidden="true">🌵</span>
        <img src={BOT_LOGO} alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />
      </button>
    </div>
  );
}
