import { describe, expect, it, vi } from 'vitest';
import {
  Crawler,
  EngineCrawlSink,
  normalizeCrawlConfig,
  SearchEngine,
  ValidationError,
  type CrawlConfig,
  type CrawlSink,
  type CrawlerDeps,
  type Fetcher,
  type FetchResult,
} from '../src/core';

interface FakePage {
  body?: string;
  status?: number;
  contentType?: string;
  finalUrl?: string;
}

/** Site falso em memória: URL -> resposta. O que não existe devolve 404. */
class FakeSite implements Fetcher {
  readonly requests: string[] = [];
  constructor(private readonly pages: Record<string, FakePage>) {}

  async fetch(url: string, _signal?: AbortSignal): Promise<FetchResult> {
    this.requests.push(url);
    const page = this.pages[url];
    if (page === undefined) return { url, status: 404, contentType: 'text/html', body: '' };
    return {
      url: page.finalUrl ?? url,
      status: page.status ?? 200,
      contentType: page.contentType ?? 'text/html; charset=utf-8',
      body: page.body ?? '',
    };
  }

  pagesRequested(): string[] {
    return this.requests.filter((url) => !url.endsWith('/robots.txt'));
  }
}

const html = (title: string, links: string[] = [], extra = ''): string =>
  `<html><head><title>${title}</title>${extra}</head><body><p>texto de ${title}</p>${links
    .map((href) => `<a href="${href}">l</a>`)
    .join('')}</body></html>`;

const config = (overrides: Partial<CrawlConfig> = {}): CrawlConfig =>
  normalizeCrawlConfig({ seeds: ['https://a.com/'], maxPages: 50, maxDepth: 5, delayMs: 100, ...overrides });

class MemorySink implements CrawlSink {
  readonly saved: Array<{ url: string; title: string; depth: number }> = [];
  save(page: { url: string; title: string; depth: number }) {
    this.saved.push({ url: page.url, title: page.title, depth: page.depth });
    return { kind: 'added' as const };
  }
}

const instant: CrawlerDeps['sleep'] = async () => {};

function crawl(site: Fetcher, cfg: CrawlConfig, sink: CrawlSink = new MemorySink(), extra: Partial<CrawlerDeps> = {}) {
  const crawler = new Crawler(cfg, { fetcher: site, sink, sleep: instant, ...extra });
  return { crawler, done: crawler.start() };
}

describe('normalizeCrawlConfig', () => {
  it('normaliza sementes, remove repetidas e inválidas', () => {
    const result = normalizeCrawlConfig({ seeds: ['https://a.com/#x', 'https://a.com/', 'lixo', 'mailto:x@y.z'] });
    expect(result.seeds).toEqual(['https://a.com/']);
  });

  it('rejeita quando não há semente válida', () => {
    expect(() => normalizeCrawlConfig({ seeds: ['lixo'] })).toThrow(ValidationError);
    expect(() => normalizeCrawlConfig({ seeds: [] })).toThrow(ValidationError);
  });

  it('força os números para dentro dos limites e usa padrões para valores inválidos', () => {
    const result = normalizeCrawlConfig({
      seeds: ['https://a.com/'], maxPages: 99999, maxDepth: -3, delayMs: 5, sameHostOnly: false,
    });
    expect(result).toMatchObject({ maxPages: 500, maxDepth: 0, delayMs: 100, sameHostOnly: false });
    expect(normalizeCrawlConfig({ seeds: ['https://a.com/'], maxPages: NaN }).maxPages).toBe(30);
  });
});

describe('Crawler: percurso', () => {
  it('visita em largura, uma vez por URL, mesmo com ciclos e links repetidos', async () => {
    const site = new FakeSite({
      'https://a.com/': { body: html('Raiz', ['/b', '/c', '/b']) },
      'https://a.com/b': { body: html('B', ['/', '/d']) },
      'https://a.com/c': { body: html('C', ['/d', '/b']) },
      'https://a.com/d': { body: html('D', ['/']) },
    });
    const sink = new MemorySink();
    await crawl(site, config(), sink).done;

    expect(site.pagesRequested()).toEqual(['https://a.com/', 'https://a.com/b', 'https://a.com/c', 'https://a.com/d']);
    expect(sink.saved.map((p) => [p.title, p.depth])).toEqual([['Raiz', 0], ['B', 1], ['C', 1], ['D', 2]]);
  });

  it('respeita maxDepth', async () => {
    const site = new FakeSite({
      'https://a.com/': { body: html('Raiz', ['/b']) },
      'https://a.com/b': { body: html('B', ['/c']) },
      'https://a.com/c': { body: html('C') },
    });
    const sink = new MemorySink();
    await crawl(site, config({ maxDepth: 1 }), sink).done;
    expect(sink.saved.map((p) => p.title)).toEqual(['Raiz', 'B']);
  });

  it('respeita maxPages (conta páginas indexadas)', async () => {
    const pages: Record<string, FakePage> = { 'https://a.com/': { body: html('Raiz', ['/1', '/2', '/3', '/4']) } };
    for (let i = 1; i <= 4; i++) pages[`https://a.com/${i}`] = { body: html(`P${i}`) };
    const sink = new MemorySink();
    const { crawler, done } = crawl(new FakeSite(pages), config({ maxPages: 3 }), sink);
    await done;
    expect(sink.saved).toHaveLength(3);
    expect(crawler.getSnapshot().state).toBe('finished');
  });

  it('com sameHostOnly não sai dos sites das sementes; sem a opção, sai', async () => {
    const pages = {
      'https://a.com/': { body: html('Raiz', ['https://b.com/x']) },
      'https://b.com/x': { body: html('Externa') },
    };
    const restricted = new MemorySink();
    await crawl(new FakeSite(pages), config({ sameHostOnly: true }), restricted).done;
    expect(restricted.saved.map((p) => p.title)).toEqual(['Raiz']);

    const open = new MemorySink();
    await crawl(new FakeSite(pages), config({ sameHostOnly: false }), open).done;
    expect(open.saved.map((p) => p.title)).toEqual(['Raiz', 'Externa']);
  });

  it('não requisita links que são claramente arquivos (imagem, pdf)', async () => {
    const site = new FakeSite({ 'https://a.com/': { body: html('Raiz', ['/foto.png', '/doc.pdf', '/ok']) }, 'https://a.com/ok': { body: html('Ok') } });
    await crawl(site, config()).done;
    expect(site.pagesRequested()).toEqual(['https://a.com/', 'https://a.com/ok']);
  });
});

describe('Crawler: regras de boas maneiras', () => {
  it('respeita o robots.txt', async () => {
    const site = new FakeSite({
      'https://a.com/robots.txt': { body: 'User-agent: *\nDisallow: /privado/\n', contentType: 'text/plain' },
      'https://a.com/': { body: html('Raiz', ['/privado/x', '/publico']) },
      'https://a.com/privado/x': { body: html('Secreta') },
      'https://a.com/publico': { body: html('Publica') },
    });
    const sink = new MemorySink();
    const { crawler, done } = crawl(site, config(), sink);
    await done;
    expect(sink.saved.map((p) => p.title)).toEqual(['Raiz', 'Publica']);
    expect(site.requests).not.toContain('https://a.com/privado/x');
    expect(crawler.getSnapshot().stats.skipped).toBe(1);
  });

  it('baixa o robots.txt uma única vez por site', async () => {
    const site = new FakeSite({
      'https://a.com/': { body: html('Raiz', ['/b', '/c']) },
      'https://a.com/b': { body: html('B') },
      'https://a.com/c': { body: html('C') },
    });
    await crawl(site, config()).done;
    expect(site.requests.filter((url) => url.endsWith('/robots.txt'))).toHaveLength(1);
  });

  it('um robots.txt que devolve HTML (ex.: página de erro) é ignorado', async () => {
    const site = new FakeSite({
      'https://a.com/robots.txt': { body: '<html>Disallow: /</html>' },
      'https://a.com/': { body: html('Raiz') },
    });
    const sink = new MemorySink();
    await crawl(site, config(), sink).done;
    expect(sink.saved).toHaveLength(1);
  });

  it('noindex: visita e segue os links, mas não indexa', async () => {
    const site = new FakeSite({
      'https://a.com/': { body: html('Raiz', ['/rascunho']) },
      'https://a.com/rascunho': { body: html('Rascunho', ['/depois'], '<meta name="robots" content="noindex">') },
      'https://a.com/depois': { body: html('Depois') },
    });
    const sink = new MemorySink();
    await crawl(site, config(), sink).done;
    expect(sink.saved.map((p) => p.title)).toEqual(['Raiz', 'Depois']);
  });

  it('nofollow na página: indexa, mas não segue os links', async () => {
    const site = new FakeSite({
      'https://a.com/': { body: html('Raiz', ['/b'], '<meta name="robots" content="nofollow">') },
      'https://a.com/b': { body: html('B') },
    });
    const sink = new MemorySink();
    await crawl(site, config(), sink).done;
    expect(sink.saved.map((p) => p.title)).toEqual(['Raiz']);
  });

  it('espera o maior valor entre a pausa configurada e o Crawl-delay do site', async () => {
    const site = new FakeSite({
      'https://a.com/robots.txt': { body: 'User-agent: *\nCrawl-delay: 2\n', contentType: 'text/plain' },
      'https://a.com/': { body: html('Raiz', ['/b']) },
      'https://a.com/b': { body: html('B') },
    });
    const sleep = vi.fn(async (_ms: number) => {});
    let clock = 0;
    await crawl(site, config({ delayMs: 300 }), new MemorySink(), { sleep, now: () => clock }).done;
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep.mock.calls[0]?.[0]).toBe(2000);
  });
});

describe('Crawler: respostas problemáticas', () => {
  it('conta erros HTTP e de rede e continua', async () => {
    const failing: Fetcher = {
      async fetch(url) {
        if (url.endsWith('/queda')) throw new Error('conexão recusada');
        return new FakeSite({
          'https://a.com/': { body: html('Raiz', ['/queda', '/quebrado', '/ok']) },
          'https://a.com/ok': { body: html('Ok') },
        }).fetch(url);
      },
    };
    const sink = new MemorySink();
    const { crawler, done } = crawl(failing, config(), sink);
    await done;
    expect(sink.saved.map((p) => p.title)).toEqual(['Raiz', 'Ok']);
    expect(crawler.getSnapshot().stats.errors).toBe(2);
    expect(crawler.getSnapshot().log.some((e) => e.level === 'error' && e.message.includes('conexão recusada'))).toBe(true);
    expect(crawler.getSnapshot().state).toBe('finished');
  });

  it('ignora conteúdo que não é HTML', async () => {
    const site = new FakeSite({
      'https://a.com/': { body: html('Raiz', ['/dados']) },
      'https://a.com/dados': { body: '{"a":1}', contentType: 'application/json' },
    });
    const sink = new MemorySink();
    const { crawler, done } = crawl(site, config(), sink);
    await done;
    expect(sink.saved).toHaveLength(1);
    expect(crawler.getSnapshot().stats.skipped).toBe(1);
  });

  it('indexa pela URL final de um redirecionamento e não repete URLs já vistas', async () => {
    const site = new FakeSite({
      'https://a.com/': { body: html('Raiz', ['/antigo', '/novo']) },
      'https://a.com/antigo': { body: html('Novo'), finalUrl: 'https://a.com/novo' },
      'https://a.com/novo': { body: html('Novo') },
    });
    const sink = new MemorySink();
    await crawl(site, config(), sink).done;
    expect(sink.saved.map((p) => p.url)).toEqual(['https://a.com/', 'https://a.com/novo']);
  });

  it('desiste de uma requisição que passa do tempo limite', async () => {
    const hanging: Fetcher = {
      fetch: (_url, signal) =>
        new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('tempo esgotado')))),
    };
    const { crawler, done } = crawl(hanging, config(), new MemorySink(), { requestTimeoutMs: 20 });
    await done;
    expect(crawler.getSnapshot().stats.errors).toBe(1);
    expect(crawler.getSnapshot().state).toBe('finished');
  });

  it('páginas rejeitadas pelo índice contam como ignoradas', async () => {
    const site = new FakeSite({ 'https://a.com/': { body: html('Raiz') } });
    const sink: CrawlSink = { save: () => ({ kind: 'rejected', reason: 'sem termos' }) };
    const { crawler, done } = crawl(site, config(), sink);
    await done;
    expect(crawler.getSnapshot().stats).toMatchObject({ skipped: 1, added: 0 });
  });
});

describe('Crawler: redirecionamentos e escopo', () => {
  it('não indexa um redirecionamento que cai em caminho proibido pelo robots.txt', async () => {
    const site = new FakeSite({
      'https://a.com/robots.txt': { body: 'User-agent: *\nDisallow: /privado/\n', contentType: 'text/plain' },
      'https://a.com/': { body: html('Raiz', ['/atalho']) },
      'https://a.com/atalho': { body: html('Privada'), finalUrl: 'https://a.com/privado/x' },
    });
    const sink = new MemorySink();
    const { crawler, done } = crawl(site, config(), sink);
    await done;
    expect(sink.saved.map((p) => p.title)).toEqual(['Raiz']);
    expect(crawler.getSnapshot().stats.skipped).toBe(1);
  });

  it('semente que redireciona para outro site (http -> https://www) continua a coleta nesse site', async () => {
    const site = new FakeSite({
      'http://a.com/': { body: html('Home', ['/sobre']), finalUrl: 'https://www.a.com/' },
      'https://www.a.com/sobre': { body: html('Sobre') },
    });
    const sink = new MemorySink();
    await crawl(site, normalizeCrawlConfig({ seeds: ['http://a.com/'], delayMs: 100 }), sink).done;
    expect(sink.saved.map((p) => p.url)).toEqual(['https://www.a.com/', 'https://www.a.com/sobre']);
  });

  it('trata www.a.com e a.com como o mesmo site, mas não outros sites', async () => {
    const site = new FakeSite({
      'https://a.com/': { body: html('Raiz', ['https://www.a.com/x', 'https://b.com/y', 'https://sub.a.com/z']) },
      'https://www.a.com/x': { body: html('X') },
      'https://b.com/y': { body: html('Y') },
      'https://sub.a.com/z': { body: html('Z') },
    });
    const sink = new MemorySink();
    await crawl(site, config({ sameHostOnly: true }), sink).done;
    expect(sink.saved.map((p) => p.title)).toEqual(['Raiz', 'X']);
  });

  it('um redirecionamento de página comum para fora do escopo é ignorado', async () => {
    const site = new FakeSite({
      'https://a.com/': { body: html('Raiz', ['/sai']) },
      'https://a.com/sai': { body: html('Fora'), finalUrl: 'https://outro.com/' },
    });
    const sink = new MemorySink();
    await crawl(site, config(), sink).done;
    expect(sink.saved.map((p) => p.title)).toEqual(['Raiz']);
  });
});

describe('Crawler: controle', () => {
  it('pausa e retoma sem perder páginas', async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    const site = new FakeSite({
      'https://a.com/': { body: html('Raiz', ['/b']) },
      'https://a.com/b': { body: html('B', ['/c']) },
      'https://a.com/c': { body: html('C') },
    });
    const gated: Fetcher = {
      async fetch(url, signal) {
        if (url.endsWith('/b')) await gate;
        return site.fetch(url, signal);
      },
    };
    const sink = new MemorySink();
    const { crawler, done } = crawl(gated, config(), sink);

    await vi.waitFor(() => expect(crawler.getSnapshot().stats.requested).toBe(2));
    crawler.pause();
    expect(crawler.getSnapshot().state).toBe('paused');
    release();
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(crawler.getSnapshot().state).toBe('paused');
    expect(crawler.getSnapshot().stats.requested).toBe(2); // não avançou para /c

    crawler.resume();
    await done;
    expect(sink.saved.map((p) => p.title)).toEqual(['Raiz', 'B', 'C']);
    expect(crawler.getSnapshot().state).toBe('finished');
  });

  it('para no meio de uma requisição e termina como "stopped"', async () => {
    const hanging: Fetcher = {
      fetch: (url, signal) =>
        url.endsWith('/robots.txt')
          ? Promise.resolve({ url, status: 404, contentType: 'text/plain', body: '' })
          : new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('abortada')))),
    };
    const { crawler, done } = crawl(hanging, config());
    await vi.waitFor(() => expect(crawler.getSnapshot().stats.requested).toBe(1));
    crawler.stop();
    expect(crawler.getSnapshot().state).toBe('stopping');
    await done;
    expect(crawler.getSnapshot().state).toBe('stopped');
    expect(crawler.getSnapshot().stats.errors).toBe(0); // a requisição abortada não é erro do site
  });

  it('não indexa a página que terminou de baixar depois do pedido de parada', async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    const site = new FakeSite({ 'https://a.com/': { body: html('Raiz') } });
    const slow: Fetcher = {
      async fetch(url, signal) {
        if (!url.endsWith('/robots.txt')) await gate; // ignora o abort de propósito: simula resposta que chega "atrasada"
        return site.fetch(url, signal);
      },
    };
    const sink = new MemorySink();
    const { crawler, done } = crawl(slow, config(), sink);
    await vi.waitFor(() => expect(crawler.getSnapshot().stats.requested).toBe(1));
    crawler.stop();
    release();
    await done;
    expect(sink.saved).toEqual([]);
    expect(crawler.getSnapshot().state).toBe('stopped');
  });

  it('parar enquanto pausado também encerra', async () => {
    const site = new FakeSite({ 'https://a.com/': { body: html('Raiz', ['/b']) }, 'https://a.com/b': { body: html('B') } });
    const sink: CrawlSink = {
      save(page) {
        crawler.pause(); // pausa assim que a primeira página é salva
        return { kind: 'added', reason: page.url };
      },
    };
    const { crawler, done } = crawl(site, config(), sink);
    await vi.waitFor(() => expect(crawler.getSnapshot().state).toBe('paused'));
    crawler.stop();
    await done;
    expect(crawler.getSnapshot().state).toBe('stopped');
    expect(site.pagesRequested()).toEqual(['https://a.com/']);
  });

  it('stop antes de start impede a coleta', async () => {
    const site = new FakeSite({ 'https://a.com/': { body: html('Raiz') } });
    const crawler = new Crawler(config(), { fetcher: site, sink: new MemorySink(), sleep: instant });
    crawler.stop();
    expect(crawler.getSnapshot().state).toBe('stopped');
    await crawler.start();
    expect(site.requests).toEqual([]);
    expect(crawler.getSnapshot().state).toBe('stopped');
  });

  it('start chamado duas vezes não inicia duas coletas', async () => {
    const site = new FakeSite({ 'https://a.com/': { body: html('Raiz') } });
    const crawler = new Crawler(config(), { fetcher: site, sink: new MemorySink(), sleep: instant });
    await Promise.all([crawler.start(), crawler.start()]);
    expect(site.pagesRequested()).toEqual(['https://a.com/']);
  });

  it('notifica assinantes e mantém o snapshot estável entre mudanças', async () => {
    const site = new FakeSite({ 'https://a.com/': { body: html('Raiz') } });
    const crawler = new Crawler(config(), { fetcher: site, sink: new MemorySink(), sleep: instant });
    const listener = vi.fn();
    crawler.subscribe(listener);
    const before = crawler.getSnapshot();
    expect(crawler.getSnapshot()).toBe(before);
    await crawler.start();
    expect(listener).toHaveBeenCalled();
    expect(crawler.getSnapshot()).not.toBe(before);
    expect(crawler.getSnapshot().stats.added).toBe(1);
  });

  it('o log guarda só as últimas 100 entradas', async () => {
    const pages: Record<string, FakePage> = {};
    const links: string[] = [];
    for (let i = 0; i < 150; i++) {
      links.push(`/p${i}`);
      pages[`https://a.com/p${i}`] = { body: html(`P${i}`) };
    }
    pages['https://a.com/'] = { body: html('Raiz', links) };
    const { crawler, done } = crawl(new FakeSite(pages), config({ maxPages: 500 }));
    await done;
    expect(crawler.getSnapshot().log).toHaveLength(100);
  });
});

describe('Crawler + SearchEngine', () => {
  it('indexa o site coletado e permite buscar; coletar de novo atualiza em vez de duplicar', async () => {
    const site = new FakeSite({
      'https://a.com/': { body: html('Início', ['/avl']) },
      'https://a.com/avl': {
        body: html('Árvore AVL', [], '<meta name="keywords" content="avl, rotação">'),
      },
    });
    const engine = new SearchEngine();

    await crawl(site, config(), new EngineCrawlSink(engine)).done;
    expect(engine.stats().pageCount).toBe(2);
    expect(engine.search('rotacao').hits[0]?.page.url).toBe('https://a.com/avl');

    const second = crawl(site, config(), new EngineCrawlSink(engine));
    await second.done;
    expect(engine.stats().pageCount).toBe(2);
    expect(second.crawler.getSnapshot().stats).toMatchObject({ added: 0, updated: 2 });
  });

  it('páginas sem termos indexáveis são rejeitadas sem derrubar a coleta', async () => {
    const site = new FakeSite({
      'https://a.com/': { body: '<html><head><title>!!!</title></head><body><a href="/b">b</a></body></html>' },
      'https://a.com/b': { body: html('Boa página') },
    });
    const engine = new SearchEngine();
    const { crawler, done } = crawl(site, config(), new EngineCrawlSink(engine));
    await done;
    expect(engine.stats().pageCount).toBe(1); // só a /b; a raiz não tem termos indexáveis
    expect(crawler.getSnapshot().stats).toMatchObject({ added: 1, skipped: 1 });
    expect(crawler.getSnapshot().state).toBe('finished'); // e os links da raiz foram seguidos mesmo assim
  });
});
