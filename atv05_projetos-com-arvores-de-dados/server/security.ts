import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

/** Erro com status HTTP, devolvido ao cliente do proxy. */
export class ProxyError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ProxyError';
  }
}

function isPrivateIPv4(address: string): boolean {
  const parts = address.split('.').map(Number);
  const [a = 0, b = 0] = parts;
  return (
    a === 0 || // "esta rede"
    a === 10 ||
    a === 127 || // loopback
    (a === 100 && b >= 64 && b <= 127) || // CGNAT
    (a === 169 && b === 254) || // link-local (inclui metadados de nuvem)
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224 // multicast e reservados
  );
}

/** Verdadeiro para endereços que não são da internet pública (loopback, rede local, link-local...). */
export function isPrivateAddress(address: string): boolean {
  const ip = address.replace(/^\[|\]$/g, '').toLowerCase();
  const family = isIP(ip);
  if (family === 4) return isPrivateIPv4(ip);
  if (family !== 6) return true; // não reconhecido: trata como inseguro

  if (ip === '::' || ip === '::1') return true;
  if (/^f[cd]/.test(ip) || /^fe[89ab]/.test(ip) || ip.startsWith('ff')) return true;

  const mapped = /^::ffff:(.+)$/.exec(ip)?.[1];
  if (mapped !== undefined) {
    if (mapped.includes('.')) return isPrivateIPv4(mapped);
    const groups = mapped.split(':').map((group) => parseInt(group, 16));
    const [high = 0, low = 0] = groups;
    return isPrivateIPv4(`${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`);
  }
  return false;
}

/**
 * Valida a URL pedida ao proxy: só http/https, sem credenciais e apenas hosts públicos.
 * Impede que a página (ou um link malicioso) use o proxy para alcançar a rede interna (SSRF).
 *
 * Limitação conhecida: o `fetch` resolve o DNS de novo, então um DNS malicioso ainda poderia
 * trocar de endereço entre a checagem e a conexão. Para uma ferramenta local de estudo, o risco
 * é aceitável; um serviço público exigiria fixar o IP validado na conexão.
 */
export async function assertPublicHttpUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ProxyError(400, 'URL inválida.');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new ProxyError(400, 'Só são aceitas URLs http e https.');
  }
  if (url.username !== '' || url.password !== '') {
    throw new ProxyError(400, 'URLs com usuário e senha não são aceitas.');
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  if (isIP(hostname) !== 0) {
    if (isPrivateAddress(hostname)) throw new ProxyError(403, 'Endereço não público bloqueado.');
    return url;
  }

  let addresses: Array<{ address: string }>;
  try {
    addresses = await lookup(hostname, { all: true });
  } catch {
    throw new ProxyError(502, `Não foi possível resolver o endereço ${hostname}.`);
  }
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new ProxyError(403, 'Endereço não público bloqueado.');
  }
  return url;
}
