/**
 * Normaliza uma URL para comparação e deduplicação: resolve contra `base`,
 * aceita só http/https, remove fragmento (#...) e credenciais embutidas.
 * Retorna `null` se a URL for inválida ou de outro protocolo (mailto:, javascript:...).
 */
export function normalizeUrl(raw: string, base?: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim(), base);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  url.hash = '';
  url.username = '';
  url.password = '';
  return url.href;
}

/** Host com porta ("localhost:5173"). */
export function hostOf(url: string): string {
  return new URL(url).host;
}

/** Caminho + query, que é o que o robots.txt avalia. */
export function pathAndQuery(url: string): string {
  const parsed = new URL(url);
  return parsed.pathname + parsed.search;
}

const NON_HTML_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico', 'bmp', 'css', 'js', 'mjs', 'json', 'xml',
  'pdf', 'zip', 'rar', 'gz', 'tar', '7z', 'mp3', 'wav', 'mp4', 'avi', 'mov', 'mkv', 'woff',
  'woff2', 'ttf', 'otf', 'exe', 'dmg', 'iso', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
]);

/** Descarta de antemão links que obviamente não são páginas HTML (economiza requisições). */
export function looksLikeHtmlUrl(url: string): boolean {
  const { pathname } = new URL(url);
  const lastSegment = pathname.slice(pathname.lastIndexOf('/') + 1);
  const dot = lastSegment.lastIndexOf('.');
  if (dot === -1) return true;
  return !NON_HTML_EXTENSIONS.has(lastSegment.slice(dot + 1).toLowerCase());
}
