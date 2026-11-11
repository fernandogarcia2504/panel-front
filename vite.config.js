import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En desarrollo, /api va a la central local. En Vercel lo resuelve vercel.json.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': process.env.CENTRAL_URL || 'http://127.0.0.1:4000' } },
});
