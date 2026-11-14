import type { Fetcher, FetchResult } from '../core';

const MAX_CHARS = 1_000_000;

interface ProxyResponse {
  url: string;
  status: number;
  contentType: string;
  body: string;
  error?: string;
}

/**
 * Baixa páginas no navegador. URLs do próprio site (ex.: o site de demonstração em /demo)
 * são buscadas direto; as demais passam pelo proxy local /api/fetch, porque o navegador
 * bloqueia (CORS) a leitura de outros sites.
 */
export class BrowserFetcher implements Fetcher {
  async fetch(url: string, signal: AbortSignal): Promise<FetchResult> {
    if (new URL(url).origin === window.location.origin) return this.direct(url, signal);
    return this.viaProxy(url, signal);
  }

  private async direct(url: string, signal: AbortSignal): Promise<FetchResult> {
    const response = await fetch(url, { signal });
    const contentType = response.headers.get('content-type') ?? '';
    const textual = /^(text\/|application\/xhtml)/i.test(contentType);
    const body = textual ? (await response.text()).slice(0, MAX_CHARS) : '';
    return { url: response.url, status: response.status, contentType, body };
  }

  private async viaProxy(url: string, signal: AbortSignal): Promise<FetchResult> {
    const response = await fetch(`/api/fetch?url=${encodeURIComponent(url)}`, { signal });
    const data = (await response.json().catch(() => null)) as ProxyResponse | null;
    if (!response.ok || data === null) {
      throw new Error(data?.error ?? `proxy respondeu HTTP ${response.status}`);
    }
    return { url: data.url, status: data.status, contentType: data.contentType, body: data.body };
  }
}
