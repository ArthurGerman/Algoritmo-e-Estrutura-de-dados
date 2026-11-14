import { describe, expect, it } from 'vitest';
import { assertPublicHttpUrl, isPrivateAddress, ProxyError } from '../server/security';

describe('isPrivateAddress', () => {
  it.each([
    '127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.169.254',
    '0.0.0.0', '100.64.0.1', '224.0.0.1', '255.255.255.255',
    '::1', '::', 'fc00::1', 'fd12:3456::1', 'fe80::1', 'ff02::1', '::ffff:127.0.0.1', '::ffff:7f00:1', '[::1]',
    'nao-e-ip',
  ])('%s é privado', (address) => {
    expect(isPrivateAddress(address)).toBe(true);
  });

  it.each(['8.8.8.8', '1.1.1.1', '172.15.0.1', '172.32.0.1', '93.184.216.34', '2606:4700:4700::1111', '::ffff:8.8.8.8'])(
    '%s é público',
    (address) => {
      expect(isPrivateAddress(address)).toBe(false);
    },
  );
});

describe('assertPublicHttpUrl', () => {
  const rejects = async (url: string, status: number) => {
    await expect(assertPublicHttpUrl(url)).rejects.toMatchObject({ name: 'ProxyError', status });
  };

  it('rejeita URL inválida, outros protocolos e credenciais', async () => {
    await rejects('não é url', 400);
    await rejects('file:///etc/passwd', 400);
    await rejects('ftp://exemplo.com/', 400);
    await rejects('https://user:senha@exemplo.com/', 400);
  });

  it('bloqueia endereços internos escritos de várias formas', async () => {
    await rejects('http://127.0.0.1:8080/', 403);
    await rejects('http://localhost/', 403);
    await rejects('http://[::1]/', 403);
    await rejects('http://2130706433/', 403); // 127.0.0.1 em decimal
    await rejects('http://0x7f.1/', 403);
    await rejects('http://169.254.169.254/latest/meta-data/', 403);
    await rejects('http://192.168.0.10/', 403);
    await rejects('http://[::ffff:10.0.0.1]/', 403);
  });

  it('aceita IP público literal', async () => {
    await expect(assertPublicHttpUrl('https://8.8.8.8/')).resolves.toBeInstanceOf(URL);
  });

  it('ProxyError carrega o status', () => {
    expect(new ProxyError(403, 'x').status).toBe(403);
  });
});
