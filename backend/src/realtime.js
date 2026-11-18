// Realtime ด้วย Server-Sent Events (SSE): browser ใช้ EventSource ต่อค้างไว้ แล้ว server push event มา
// มีสองช่อง: public (สินค้า/สต็อก) และ admin (สินค้า + ออเดอร์ ซึ่งมีข้อมูลลูกค้า)
const channels = { public: new Set(), admin: new Set() };

export function subscribe(channel, req, res) {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // กัน nginx/proxy buffer
  });
  res.flushHeaders();
  res.write('retry: 3000\n\n');
  res.write(`event: ready\ndata: {}\n\n`);

  const clients = channels[channel];
  clients.add(res);
  const ping = setInterval(() => res.write(': ping\n\n'), 25000); // กัน connection หลุดเพราะ idle
  req.on('close', () => {
    clearInterval(ping);
    clients.delete(res);
  });
}

function send(clients, event, payload) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const res of clients) res.write(msg);
}

/** event ที่ทุกคนเห็นได้ (สินค้า) */
export function broadcastPublic(event, payload) {
  send(channels.public, event, payload);
  send(channels.admin, event, payload);
}

/** event เฉพาะ admin (ออเดอร์) */
export function broadcastAdmin(event, payload) {
  send(channels.admin, event, payload);
}
