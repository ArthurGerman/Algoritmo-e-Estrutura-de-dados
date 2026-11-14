import { normalizeUrl } from '../url';

export interface ParsedHtml {
  title: string;
  /** Texto visível da página (sem tags, scripts e estilos), limitado a MAX_TEXT_CHARS. */
  text: string;
  /** Palavras-chave da meta tag `keywords` e dos títulos h1/h2. */
  keywords: string[];
  /** Links absolutos, normalizados e sem repetição. */
  links: string[];
  /** `<meta name="robots" content="noindex">`: a página não deve ser indexada. */
  noindex: boolean;
  /** `nofollow` na meta robots: os links da página não devem ser seguidos. */
  nofollow: boolean;
}

export const MAX_TEXT_CHARS = 20_000;
const MAX_INPUT_CHARS = 1_000_000;
const MAX_LINKS = 500;
const MAX_KEYWORDS = 20;
const MAX_TITLE_CHARS = 300;

// ---------------------------------------------------------------- tokenização
//
// O HTML é lido por um tokenizador de passagem única (sem regex com
// backtracking), então o custo é linear mesmo com HTML malformado ou hostil.

type Token =
  | { kind: 'text'; text: string }
  | { kind: 'open'; name: string; attrs: Map<string, string> }
  | { kind: 'close'; name: string };

/** Elementos cujo conteúdo não é texto de leitura: é descartado por inteiro. */
const RAW_TEXT_ELEMENTS = new Set(['script', 'style', 'noscript', 'template', 'svg', 'iframe', 'object']);

const asciiLower = (text: string): string =>
  text.replace(/[A-Z]/g, (char) => String.fromCharCode(char.charCodeAt(0) + 32));

const isSpace = (char: string | undefined): boolean =>
  char === ' ' || char === '\n' || char === '\t' || char === '\r' || char === '\f';

const isNameChar = (code: number): boolean =>
  (code >= 97 && code <= 122) || (code >= 65 && code <= 90) || (code >= 48 && code <= 57) || code === 45 || code === 58;

/** Índice do '>' que fecha a tag, respeitando aspas de valores de atributo. -1 se não houver. */
function findTagEnd(html: string, from: number): number {
  let quote = '';
  let lastSignificant = '';
  for (let k = from; k < html.length; k++) {
    const char = html.charAt(k);
    if (quote !== '') {
      if (char === quote) quote = '';
    } else if ((char === '"' || char === "'") && lastSignificant === '=') {
      quote = char;
    } else if (char === '>') {
      return k;
    }
    if (!isSpace(char)) lastSignificant = char;
  }
  return -1;
}

function parseAttributes(source: string): Map<string, string> {
  const attrs = new Map<string, string>();
  const n = source.length;
  let k = 0;
  while (k < n) {
    while (k < n && (isSpace(source.charAt(k)) || source.charAt(k) === '/')) k++;
    const start = k;
    while (k < n && !isSpace(source.charAt(k)) && source.charAt(k) !== '=' && source.charAt(k) !== '/') k++;
    if (k === start) {
      k++; // '=' solto: avança para não travar
      continue;
    }
    const name = source.slice(start, k).toLowerCase();
    while (k < n && isSpace(source.charAt(k))) k++;
    let value = '';
    if (source.charAt(k) === '=') {
      k++;
      while (k < n && isSpace(source.charAt(k))) k++;
      const quote = source.charAt(k);
      if (quote === '"' || quote === "'") {
        const end = source.indexOf(quote, k + 1);
        value = source.slice(k + 1, end === -1 ? n : end);
        k = end === -1 ? n : end + 1;
      } else {
        const valueStart = k;
        while (k < n && !isSpace(source.charAt(k))) k++;
        value = source.slice(valueStart, k);
      }
    }
    if (!attrs.has(name)) attrs.set(name, decodeEntities(value));
  }
  return attrs;
}

function* tokenize(html: string): Generator<Token, void, undefined> {
  const lower = asciiLower(html); // mesmo comprimento que `html`
  const n = html.length;
  let i = 0;
  while (i < n) {
    const lt = html.indexOf('<', i);
    if (lt === -1) {
      yield { kind: 'text', text: html.slice(i) };
      return;
    }
    if (lt > i) yield { kind: 'text', text: html.slice(i, lt) };

    if (html.startsWith('<!--', lt)) {
      const end = html.indexOf('-->', lt + 4);
      if (end === -1) return;
      i = end + 3;
      continue;
    }
    const next = html.charAt(lt + 1);
    if (next === '!' || next === '?') {
      const end = html.indexOf('>', lt + 2);
      if (end === -1) return;
      i = end + 1;
      continue;
    }

    const closing = next === '/';
    const nameStart = lt + (closing ? 2 : 1);
    let nameEnd = nameStart;
    while (nameEnd < n && isNameChar(html.charCodeAt(nameEnd))) nameEnd++;
    if (nameEnd === nameStart) {
      yield { kind: 'text', text: '<' }; // '<' literal, não é tag
      i = lt + 1;
      continue;
    }

    const name = lower.slice(nameStart, nameEnd);
    const end = findTagEnd(html, nameEnd);
    if (end === -1) return; // tag sem fechamento: ignora o resto
    i = end + 1;

    if (closing) {
      yield { kind: 'close', name };
      continue;
    }
    const inner = html.slice(nameEnd, end);
    yield { kind: 'open', name, attrs: parseAttributes(inner) };

    if (RAW_TEXT_ELEMENTS.has(name) && !inner.trimEnd().endsWith('/')) {
      const closeIndex = lower.indexOf(`</${name}`, i);
      if (closeIndex === -1) return;
      i = closeIndex; // descarta o conteúdo; a tag de fechamento é lida na próxima volta
    }
  }
}

// ------------------------------------------------------------------- entidades

const NAMED_ENTITIES: Readonly<Record<string, string>> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', copy: '©', reg: '®', hellip: '…',
  mdash: '—', ndash: '–', laquo: '«', raquo: '»', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
  aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', Aacute: 'Á', Eacute: 'É',
  Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú', agrave: 'à', Agrave: 'À', acirc: 'â', ecirc: 'ê',
  ocirc: 'ô', Acirc: 'Â', Ecirc: 'Ê', Ocirc: 'Ô', atilde: 'ã', otilde: 'õ', Atilde: 'Ã',
  Otilde: 'Õ', ccedil: 'ç', Ccedil: 'Ç', uuml: 'ü', ntilde: 'ñ',
};

export function decodeEntities(text: string): string {
  if (!text.includes('&')) return text;
  return text.replace(/&(#x[0-9a-f]{1,6}|#\d{1,7}|[a-z][a-z0-9]{1,9});/gi, (match, body: string) => {
    if (body.startsWith('#')) {
      const code = body.charAt(1).toLowerCase() === 'x' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      try {
        return String.fromCodePoint(code);
      } catch {
        return ' ';
      }
    }
    return NAMED_ENTITIES[body] ?? match;
  });
}

// --------------------------------------------------------------------- análise

const collapse = (text: string): string => text.replace(/\s+/g, ' ').trim();

/**
 * Extrai de uma página HTML o que o buscador precisa: título, texto, palavras-chave,
 * links e as diretivas de robots. Implementação própria, sem DOMParser nem bibliotecas,
 * para rodar igual no navegador, no Node e nos testes.
 */
export function parseHtml(rawHtml: string, pageUrl: string): ParsedHtml {
  const html = rawHtml.length > MAX_INPUT_CHARS ? rawHtml.slice(0, MAX_INPUT_CHARS) : rawHtml;

  let titleParts: string[] = [];
  let titleOpen = false;
  let titleDone = false;
  let inHead = false;
  let heading: { parts: string[] } | null = null;
  let description = '';
  let noindex = false;
  let nofollow = false;
  let baseHref: string | undefined;

  const textParts: string[] = [];
  const metaKeywords: string[] = [];
  const headings: string[] = [];
  const hrefs: string[] = [];

  for (const token of tokenize(html)) {
    if (token.kind === 'text') {
      const decoded = decodeEntities(token.text);
      if (titleOpen) titleParts.push(decoded);
      else if (!inHead) {
        textParts.push(decoded);
        heading?.parts.push(decoded);
      }
      continue;
    }

    // Qualquer tag separa palavras ("a<b>c" não vira "ac") e encerra o <title>.
    if (titleOpen) {
      titleOpen = false;
      titleDone = true;
    }
    textParts.push(' ');

    if (token.kind === 'close') {
      if (token.name === 'head') inHead = false;
      if ((token.name === 'h1' || token.name === 'h2') && heading !== null) {
        const value = collapse(heading.parts.join(' '));
        if (value !== '') headings.push(value);
        heading = null;
      }
      continue;
    }

    switch (token.name) {
      case 'head':
        inHead = true;
        break;
      case 'body':
        inHead = false;
        break;
      case 'title':
        if (!titleDone) {
          titleOpen = true;
          titleParts = [];
        }
        break;
      case 'base': {
        const href = token.attrs.get('href');
        if (href !== undefined && baseHref === undefined) baseHref = href;
        break;
      }
      case 'meta': {
        const name = (token.attrs.get('name') ?? '').toLowerCase();
        const content = token.attrs.get('content') ?? '';
        if (name === 'keywords') {
          metaKeywords.push(...content.split(','));
        } else if (name === 'description') {
          if (description === '') description = collapse(content);
        } else if (name === 'robots' || name === 'buscadorwebaed') {
          const directives = content.toLowerCase().split(/[\s,]+/);
          if (directives.includes('noindex') || directives.includes('none')) noindex = true;
          if (directives.includes('nofollow') || directives.includes('none')) nofollow = true;
        }
        break;
      }
      case 'a': {
        const href = token.attrs.get('href');
        const rel = (token.attrs.get('rel') ?? '').toLowerCase().split(/\s+/);
        if (href !== undefined && !rel.includes('nofollow') && hrefs.length < MAX_LINKS * 2) hrefs.push(href);
        break;
      }
      case 'h1':
      case 'h2':
        heading = { parts: [] };
        break;
      default:
        break;
    }
  }

  const base = normalizeUrl(baseHref ?? '', pageUrl) ?? pageUrl;
  const links = new Set<string>();
  for (const href of hrefs) {
    if (links.size >= MAX_LINKS) break;
    const resolved = normalizeUrl(href, base);
    if (resolved !== null) links.add(resolved);
  }

  const text = collapse([description, ...textParts].join(' ')).slice(0, MAX_TEXT_CHARS);
  const title = collapse(titleParts.join(' ')).slice(0, MAX_TITLE_CHARS) || headings[0] || pageUrl;
  const keywords = [...new Set([...metaKeywords, ...headings].map(collapse).filter((k) => k !== ''))].slice(
    0,
    MAX_KEYWORDS,
  );

  return { title, text, keywords, links: [...links], noindex, nofollow };
}
