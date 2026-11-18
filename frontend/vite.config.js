import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // ตอน dev ส่ง /api ต่อไปที่ backend เลยไม่ต้องตั้ง VITE_API_URL
    proxy: {
      '/api': 'http://localhost:4000',
      '/api-docs': 'http://localhost:4000',
    },
  },
});
