import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fetchProxyPlugin } from './server/fetchProxyPlugin';

export default defineConfig({
  plugins: [react(), fetchProxyPlugin()],
  // 'mpa': caminhos inexistentes devolvem 404 (e não o index.html do app).
  // Sem isso, o crawler indexaria a própria interface ao tropeçar num link quebrado.
  appType: 'mpa',
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
