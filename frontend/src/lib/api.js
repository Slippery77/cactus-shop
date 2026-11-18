export const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error || `Request failed (${status})`);
    this.status = status;
    this.details = body?.details;
  }
}

export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${API_URL}/api${path}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data);
  // ได้ 200 แต่ไม่ใช่ JSON = ยิงไปผิดที่ (ส่วนใหญ่คือยังไม่ได้ตั้ง VITE_API_URL ตอน deploy)
  if (data === null) throw new ApiError(res.status, { error: 'ติดต่อ API ไม่ได้ (ตรวจสอบ VITE_API_URL)' });
  return data;
}

/** เปิด SSE stream แล้วผูก handler ตามชื่อ event คืนฟังก์ชันสำหรับปิด */
export function openEvents(path, handlers) {
  const es = new EventSource(`${API_URL}/api${path}`);
  for (const [event, fn] of Object.entries(handlers)) {
    es.addEventListener(event, (e) => {
      let payload = null;
      try {
        payload = e.data ? JSON.parse(e.data) : null;
      } catch {
        return;
      }
      fn(payload);
    });
  }
  return () => es.close();
}
