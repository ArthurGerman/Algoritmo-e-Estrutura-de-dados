import { describe, expect, it } from 'vitest';
import { hostOf, looksLikeHtmlUrl, normalizeUrl, pathAndQuery } from '../src/core/url';

describe('normalizeUrl', () => {
  it('resolve links relativos, remove fragmento e credenciais', () => {
    expect(normalizeUrl('../b.html#x', 'https://s.com/a/c/d.html')).toBe('https://s.com/a/b.html');
    expect(normalizeUrl('https://u:p@S.com:443/x#y')).toBe('https://s.com/x');
    expect(normalizeUrl('  /raiz ', 'http://s.com/a/b')).toBe('http://s.com/raiz');
  });

  it('aceita só http e https', () => {
    for (const raw of ['mailto:a@b.com', 'javascript:alert(1)', 'ftp://x.com/a', 'data:text/html,x', 'tel:123']) {
      expect(normalizeUrl(raw, 'https://s.com/')).toBeNull();
    }
  });

  it('devolve null para URL inválida', () => {
    expect(normalizeUrl('')).toBeNull();
    expect(normalizeUrl('sem-base')).toBeNull();
  });
});

describe('helpers de URL', () => {
  it('hostOf inclui a porta e pathAndQuery inclui a query', () => {
    expect(hostOf('http://localhost:5173/demo/')).toBe('localhost:5173');
    expect(pathAndQuery('https://s.com/a/b?x=1&y=2#f')).toBe('/a/b?x=1&y=2');
  });

  it('looksLikeHtmlUrl descarta arquivos que claramente não são páginas', () => {
    expect(looksLikeHtmlUrl('https://s.com/')).toBe(true);
    expect(looksLikeHtmlUrl('https://s.com/a/pagina')).toBe(true);
    expect(looksLikeHtmlUrl('https://s.com/a.html')).toBe(true);
    expect(looksLikeHtmlUrl('https://s.com/a.PHP?x=1')).toBe(true);
    expect(looksLikeHtmlUrl('https://s.com/foto.JPG')).toBe(false);
    expect(looksLikeHtmlUrl('https://s.com/doc.pdf?download=1')).toBe(false);
  });
});
