import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // O preview de produção é servido internamente pelo PM2 e recebido pelo
  // Nginx através deste domínio. A lista explícita evita aceitar hosts
  // arbitrários sem bloquear o domínio oficial do sistema.
  preview: {
    allowedHosts: ['ticket.famba.online']
  }
});
