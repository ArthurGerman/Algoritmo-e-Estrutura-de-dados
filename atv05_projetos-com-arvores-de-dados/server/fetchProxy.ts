import type { IncomingMessage, ServerResponse } from 'node:http';
import { assertPublicHttpUrl, ProxyError } from './security';

/** Identifica o crawler para os sites visitados. Contém o nome usado no robots.txt. */
export const USER_AGENT = 'BuscadorWebAED/0.1 (projeto academico; crawler simples)';

const MAX_BYTES = 1_000_000;
const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 10_000;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

export interface ProxyResult {
  /** URL final, depois dos redirecionamentos. */
  url: string;
  status: number;
  contentType: string;
  body: string;
  truncated: boolean;
}

/**
 * O navegador informa a origem da requisição em `Sec-Fetch-Site`. Só aceitamos o próprio app
 * ("same-origin") ou requisições sem origem de página ("none"/ausente, como testes e curl).
 * Isso impede que outro site aberto no navegador use o proxy local às escondidas.
 */
export function isAllowedFetchSite(header: string | string[] | undefined): boolean {
  if (header === undefined) return true;
  return header === 'same-origin' || header === 'none';
}

const isTextual = (contentType: string): boolean => /^(text\/|application\/xhtml)/i.test(contentType);

function decode(bytes: Uint8Array, contentType: string, truncated: boolean): string {
  const charset = /charset=["']?([\w-]+)/i.exec(contentType)?.[1];
  if (charset !== undefined) {
    try {
      return new TextDecoder(charset).decode(bytes);
    } catch {
      // charset desconhecido: tenta UTF-8 abaixo
    }
  }
  try {
    return new TextDecoder('utf-8', { fatal: !truncated }).decode(bytes);
  } catch {
    return new TextDecoder('windows-1252').decode(bytes); // páginas antigas em Latin-1
  }
}

async function readLimited(response: Response): Promise<{ bytes: Uint8Array; truncated: boolean }> {
  const reader = response.body?.getReader();
  if (reader === undefined) return { bytes: new Uint8Array(0), truncated: false };

  const chunks: Uint8Array[] = [];
  let total = 0;
  let truncated = false;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > MAX_BYTES) {
      chunks.push(value.subarray(0, value.length - (total - MAX_BYTES)));
      truncated = true;
      await reader.cancel();
      break;
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(Math.min(total, MAX_BYTES));
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return { bytes, truncated };
}

/**
 * Baixa uma página pública em nome do navegador (que não pode, por causa do CORS).
 * Cada salto de redirecionamento é revalidado; o corpo é limitado a 1 MB e só é lido se for texto.
 */
export async function proxyFetch(rawUrl: string): Promise<ProxyResult> {
  let current = rawUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const url = await assertPublicHttpUrl(current);

    let response: Response;
    try {
      response = await fetch(url, {
        redirect: 'manual',
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: {
          'user-agent': USER_AGENT,
          accept: 'text/html,text/plain;q=0.9,*/*;q=0.1',
          'accept-language': 'pt-BR,pt;q=0.9,en;q=0.5',
        },
      });
    } catch {
      throw new ProxyError(502, 'Não foi possível baixar a página (rede, tempo esgotado ou site fora do ar).');
    }

    const location = response.headers.get('location');
    if (REDIRECT_STATUSES.has(response.status) && location !== null) {
      await response.body?.cancel();
      try {
        current = new URL(location, url).href;
      } catch {
        throw new ProxyError(502, 'O site enviou um redirecionamento inválido.');
      }
      continue;
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!isTextual(contentType)) {
      await response.body?.cancel();
      return { url: url.href, status: response.status, contentType, body: '', truncated: false };
    }
    let read: { bytes: Uint8Array; truncated: boolean };
    try {
      read = await readLimited(response);
    } catch {
      throw new ProxyError(504, 'Tempo esgotado ao ler a página.');
    }
    const { bytes, truncated } = read;
    return { url: url.href, status: response.status, contentType, body: decode(bytes, contentType, truncated), truncated };
  }
  throw new ProxyError(502, 'Redirecionamentos demais.');
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(payload));
}

/** Middleware (estilo connect) que atende GET /api/fetch?url=... apenas para conexões locais. */
export function createFetchProxyHandler(): (
  req: IncomingMessage,
  res: ServerResponse,
  next: (error?: unknown) => void,
) => void {
  return (req, res, next) => {
    const requestUrl = new URL(req.url ?? '/', 'http://localhost');
    if (requestUrl.pathname !== '/api/fetch') return next();

    if (!LOOPBACK.has(req.socket.remoteAddress ?? '')) {
      return sendJson(res, 403, { error: 'O proxy só atende conexões locais.' });
    }
    if (!isAllowedFetchSite(req.headers['sec-fetch-site'])) {
      return sendJson(res, 403, { error: 'Requisição de outra origem bloqueada.' });
    }
    if (req.method !== 'GET') return sendJson(res, 405, { error: 'Método não permitido.' });
    const target = requestUrl.searchParams.get('url');
    if (target === null || target === '') return sendJson(res, 400, { error: 'Parâmetro "url" ausente.' });

    proxyFetch(target).then(
      (result) => sendJson(res, 200, result),
      (error: unknown) => {
        if (error instanceof ProxyError) sendJson(res, error.status, { error: error.message });
        else sendJson(res, 500, { error: 'Erro interno do proxy.' });
      },
    );
  };
}
