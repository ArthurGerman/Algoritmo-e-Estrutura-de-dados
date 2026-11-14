import type { Plugin } from 'vite';
import { createFetchProxyHandler } from './fetchProxy';

/** Plugin do Vite: instala o proxy de busca de páginas no servidor de desenvolvimento e no preview. */
export function fetchProxyPlugin(): Plugin {
  const handler = createFetchProxyHandler();
  return {
    name: 'crawler-fetch-proxy',
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}
