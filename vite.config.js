import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    https: false,  // HTTP is fine for localhost
    port: 5173,
    host: true,    // bind all interfaces (incl. IPv4) — required for devcontainer port forwarding
  },
});
