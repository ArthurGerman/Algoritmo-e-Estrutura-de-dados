import { createServer, request, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createFetchProxyHandler, isAllowedFetchSite } from '../server/fetchProxy';

let server: Server;
let port = 0;

beforeAll(async () => {
  const handler = createFetchProxyHandler();
  server = createServer((req, res) =>
    handler(req, res, () => {
      res.statusCode = 404;
      res.end('próximo middleware');
    }),
  );
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  port = (server.address() as AddressInfo).port;
});

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

function call(path: string, options: { method?: string; headers?: Record<string, string> } = {}) {
  return new Promise<{ status: number; body: string }>((resolve, reject) => {
    const req = request(
      { host: '127.0.0.1', port, path, method: options.method ?? 'GET', headers: options.headers ?? {} },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk: string) => (body += chunk));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
      },
    );
    req.on('error', reject);
    req.end();
  });
}

describe('isAllowedFetchSite', () => {
  it('aceita same-origin, none e ausência do cabeçalho; recusa o resto', () => {
    expect(isAllowedFetchSite(undefined)).toBe(true);
    expect(isAllowedFetchSite('same-origin')).toBe(true);
    expect(isAllowedFetchSite('none')).toBe(true);
    expect(isAllowedFetchSite('cross-site')).toBe(false);
    expect(isAllowedFetchSite('same-site')).toBe(false);
  });
});

describe('proxy /api/fetch (handler)', () => {
  it('deixa passar caminhos que não são do proxy', async () => {
    const res = await call('/outra-coisa');
    expect(res).toEqual({ status: 404, body: 'próximo middleware' });
  });

  it('exige o parâmetro url', async () => {
    expect((await call('/api/fetch')).status).toBe(400);
    expect((await call('/api/fetch?url=')).status).toBe(400);
  });

  it('só aceita GET', async () => {
    expect((await call('/api/fetch?url=https://8.8.8.8/', { method: 'POST' })).status).toBe(405);
  });

  it('bloqueia requisições que o navegador marca como de outro site', async () => {
    const res = await call('/api/fetch?url=https://8.8.8.8/', { headers: { 'sec-fetch-site': 'cross-site' } });
    expect(res.status).toBe(403);
    expect(JSON.parse(res.body)).toHaveProperty('error');
  });

  it('bloqueia destinos internos e protocolos não http', async () => {
    expect((await call(`/api/fetch?url=${encodeURIComponent('http://127.0.0.1:1/')}`)).status).toBe(403);
    expect((await call(`/api/fetch?url=${encodeURIComponent('file:///etc/passwd')}`)).status).toBe(400);
  });

  it('responde em JSON sem permitir cache', async () => {
    const res = await call('/api/fetch');
    expect(() => JSON.parse(res.body)).not.toThrow();
  });
});
