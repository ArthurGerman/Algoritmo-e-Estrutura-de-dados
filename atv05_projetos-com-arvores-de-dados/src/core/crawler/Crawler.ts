import type { PageInput } from '../types';
import { hostOf, looksLikeHtmlUrl, normalizeUrl, pathAndQuery } from '../url';
import type { CrawlConfig } from './CrawlConfig';
import { ROBOTS_AGENT, type Fetcher, type FetchResult } from './Fetcher';
import { parseHtml } from './HtmlParser';
import { RobotsRules } from './RobotsRules';

export type CrawlState = 'idle' | 'running' | 'paused' | 'stopping' | 'stopped' | 'finished';

export interface CrawlStats {
  /** URLs ainda na fila. */
  queued: number;
  /** Páginas requisitadas (não conta o robots.txt). */
  requested: number;
  added: number;
  updated: number;
  skipped: number;
  errors: number;
}

export interface CrawlLogEntry {
  id: number;
  time: number;
  level: 'info' | 'warn' | 'error';
  message: string;
}

/** Estado imutável do crawler, próprio para `useSyncExternalStore`. */
export interface CrawlSnapshot {
  state: CrawlState;
  stats: CrawlStats;
  currentUrl: string | null;
  log: readonly CrawlLogEntry[];
}

export interface CrawledPage extends PageInput {
  depth: number;
}

export interface SaveResult {
  kind: 'added' | 'updated' | 'rejected';
  reason?: string;
}

/** Destino das páginas coletadas (na aplicação, o índice do buscador). */
export interface CrawlSink {
  save(page: CrawledPage): SaveResult | Promise<SaveResult>;
}

export type Sleep = (ms: number, signal: AbortSignal) => Promise<void>;

export interface CrawlerDeps {
  fetcher: Fetcher;
  sink: CrawlSink;
  sleep?: Sleep;
  now?: () => number;
  requestTimeoutMs?: number;
}

interface QueueItem {
  url: string;
  depth: number;
}

const MAX_LOG_ENTRIES = 100;
const MAX_FRONTIER = 5_000;
const MAX_URL_LENGTH = 2_000;
/** Teto de requisições por página indexada, para o crawler nunca girar sem fim em sites cheios de erros. */
const REQUESTS_PER_PAGE_BUDGET = 4;

/** Identifica o "site" de uma URL: o host sem porta padrão e sem "www." (www.a.com e a.com são o mesmo site). */
const siteKey = (url: string): string => hostOf(url).replace(/^www\./, '');

const defaultSleep: Sleep = (ms, signal) =>
  new Promise((resolve) => {
    if (signal.aborted) return resolve();
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });

export const INITIAL_CRAWL_SNAPSHOT: CrawlSnapshot = {
  state: 'idle',
  stats: { queued: 0, requested: 0, added: 0, updated: 0, skipped: 0, errors: 0 },
  currentUrl: null,
  log: [],
};

/**
 * Crawler simples feito do zero: busca em largura (BFS) a partir das sementes.
 *
 * Boas práticas implementadas:
 * - respeita o robots.txt (Allow/Disallow, curingas, Crawl-delay) e as metas noindex/nofollow;
 * - pausa entre requisições ao mesmo site;
 * - cada URL é visitada uma vez (conjunto de URLs vistas), então ciclos de links não travam;
 * - limites de páginas, profundidade, tamanho da fila e tempo por requisição;
 * - pausar, continuar e parar a qualquer momento.
 *
 * Uma instância faz uma coleta só: para nova coleta, crie outro `Crawler`.
 * A rede e o destino das páginas são injetados (`Fetcher` e `CrawlSink`).
 */
export class Crawler {
  private readonly sleep: Sleep;
  private readonly now: () => number;
  private readonly timeoutMs: number;

  private frontier: QueueItem[] = [];
  private head = 0;
  private readonly seen = new Set<string>();
  private readonly allowedSites: Set<string>;
  private readonly robots = new Map<string, RobotsRules>();
  private readonly lastRequestAt = new Map<string, number>();
  private readonly runAbort = new AbortController();
  private resumeWaiters: Array<() => void> = [];
  private runPromise: Promise<void> | null = null;

  private state: CrawlState = 'idle';
  private stopRequested = false;
  private currentUrl: string | null = null;
  private log: readonly CrawlLogEntry[] = [];
  private nextLogId = 1;
  private readonly counters = { requested: 0, added: 0, updated: 0, skipped: 0, errors: 0 };

  private snapshotValue: CrawlSnapshot = INITIAL_CRAWL_SNAPSHOT;
  private readonly listeners = new Set<() => void>();

  constructor(
    private readonly config: CrawlConfig,
    private readonly deps: CrawlerDeps,
  ) {
    this.sleep = deps.sleep ?? defaultSleep;
    this.now = deps.now ?? Date.now;
    this.timeoutMs = deps.requestTimeoutMs ?? 15_000;
    this.allowedSites = new Set(config.seeds.map(siteKey));
    this.snapshotValue = this.buildSnapshot();
  }

  // ------------------------------------------------------------------ controle

  /** Inicia a coleta. A promessa resolve quando ela termina (concluída ou parada). */
  start(): Promise<void> {
    this.runPromise ??= this.run();
    return this.runPromise;
  }

  pause(): void {
    if (this.state !== 'running') return;
    this.state = 'paused';
    this.addLog('info', 'Coleta pausada.');
  }

  resume(): void {
    if (this.state !== 'paused') return;
    this.state = 'running';
    this.addLog('info', 'Coleta retomada.');
    this.flushWaiters();
  }

  stop(): void {
    if (this.state === 'idle') {
      this.stopRequested = true;
      this.state = 'stopped';
      this.emit();
      return;
    }
    if (this.state !== 'running' && this.state !== 'paused') return;
    this.stopRequested = true;
    this.state = 'stopping';
    this.addLog('info', 'Parando…');
    this.runAbort.abort();
    this.flushWaiters();
  }

  // --------------------------------------------------------------- observação

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  readonly getSnapshot = (): CrawlSnapshot => this.snapshotValue;

  // ------------------------------------------------------------------ execução

  private async run(): Promise<void> {
    if (this.stopRequested) return;
    this.state = 'running';
    this.addLog('info', `Coleta iniciada com ${this.config.seeds.length} semente(s).`);
    for (const seed of this.config.seeds) this.enqueue(seed, 0);

    try {
      while (this.head < this.frontier.length && !this.stopRequested && this.hasBudget()) {
        await this.waitWhilePaused();
        if (this.stopRequested) break;
        const item = this.frontier[this.head++];
        if (item === undefined) break;
        this.compactFrontier();
        await this.visit(item);
      }
    } catch (error) {
      this.counters.errors++;
      this.addLog('error', `Falha inesperada: ${describe(error)}`);
    }

    this.currentUrl = null;
    this.state = this.stopRequested ? 'stopped' : 'finished';
    this.addLog(
      'info',
      `${this.stopRequested ? 'Coleta interrompida' : 'Coleta concluída'}: ${this.counters.added} nova(s), ` +
        `${this.counters.updated} atualizada(s), ${this.counters.skipped} ignorada(s), ${this.counters.errors} erro(s).`,
    );
  }

  private hasBudget(): boolean {
    const indexed = this.counters.added + this.counters.updated;
    return indexed < this.config.maxPages && this.counters.requested < this.config.maxPages * REQUESTS_PER_PAGE_BUDGET;
  }

  private async visit({ url, depth }: QueueItem): Promise<void> {
    this.currentUrl = url;
    this.emit();

    const rules = await this.rulesFor(url);
    if (this.stopRequested) return;
    if (!rules.isAllowed(pathAndQuery(url))) {
      this.skip(`Bloqueada pelo robots.txt: ${url}`);
      return;
    }

    await this.waitPoliteDelay(url, rules.crawlDelayMs);
    await this.waitWhilePaused();
    if (this.stopRequested) return;

    this.counters.requested++;
    this.emit(); // a interface mostra o contador sem esperar o próximo registro do log
    let result: FetchResult;
    try {
      result = await this.timedFetch(url);
    } catch (error) {
      if (this.stopRequested) return;
      this.counters.errors++;
      this.addLog('error', `Erro ao baixar ${url}: ${describe(error)}`);
      return;
    }
    if (this.stopRequested) return; // parou durante o download: não indexa nada novo

    if (result.status < 200 || result.status >= 300) {
      this.counters.errors++;
      this.addLog('warn', `HTTP ${result.status}: ${url}`);
      return;
    }
    if (!/html/i.test(result.contentType)) {
      this.skip(`Ignorada (não é HTML): ${url}`);
      return;
    }

    const finalUrl = normalizeUrl(result.url) ?? url;
    if (finalUrl !== url) {
      // Sementes podem redirecionar (http → https, domínio → www): o destino passa a ser um site permitido.
      if (depth === 0) this.allowedSites.add(siteKey(finalUrl));
      if (this.seen.has(finalUrl) || !this.isHostAllowed(finalUrl)) {
        this.skip(`Redirecionamento para URL já vista ou fora do escopo: ${url} → ${finalUrl}`);
        return;
      }
      this.seen.add(finalUrl);
      // O destino também precisa respeitar o robots.txt (do site de destino).
      const finalRules = await this.rulesFor(finalUrl);
      if (this.stopRequested) return;
      if (!finalRules.isAllowed(pathAndQuery(finalUrl))) {
        this.skip(`Redirecionamento para caminho bloqueado pelo robots.txt: ${url} → ${finalUrl}`);
        return;
      }
    }

    const parsed = parseHtml(result.body, finalUrl);

    if (parsed.noindex) {
      this.skip(`Marcada com noindex: ${finalUrl}`);
    } else {
      const saved = await this.deps.sink.save({
        title: parsed.title,
        url: finalUrl,
        content: parsed.text,
        keywords: parsed.keywords,
        depth,
      });
      if (saved.kind === 'rejected') {
        this.skip(`Rejeitada pelo índice (${saved.reason ?? 'motivo não informado'}): ${finalUrl}`);
      } else {
        this.counters[saved.kind]++;
        this.addLog('info', `${saved.kind === 'added' ? 'Indexada' : 'Atualizada'} (nível ${depth}): ${parsed.title}`);
      }
    }

    if (!parsed.nofollow && depth < this.config.maxDepth) {
      for (const link of parsed.links) this.enqueue(link, depth + 1);
    }
  }

  private enqueue(url: string, depth: number): void {
    if (this.seen.has(url) || url.length > MAX_URL_LENGTH) return;
    if (!looksLikeHtmlUrl(url) || !this.isHostAllowed(url)) return;
    if (this.frontier.length - this.head >= MAX_FRONTIER) return;
    this.seen.add(url);
    this.frontier.push({ url, depth });
  }

  private isHostAllowed(url: string): boolean {
    return !this.config.sameHostOnly || this.allowedSites.has(siteKey(url));
  }

  private compactFrontier(): void {
    if (this.head > 1_000 && this.head * 2 > this.frontier.length) {
      this.frontier = this.frontier.slice(this.head);
      this.head = 0;
    }
  }

  /** Baixa (uma vez por site) e interpreta o robots.txt. Qualquer falha significa "sem restrições". */
  private async rulesFor(url: string): Promise<RobotsRules> {
    const origin = new URL(url).origin;
    const cached = this.robots.get(origin);
    if (cached !== undefined) return cached;

    let rules = RobotsRules.allowAll();
    try {
      const result = await this.timedFetch(`${origin}/robots.txt`);
      if (result.status >= 200 && result.status < 300 && !/html/i.test(result.contentType)) {
        rules = RobotsRules.parse(result.body, ROBOTS_AGENT);
      }
    } catch {
      // Sem robots.txt acessível: segue sem restrições.
    }
    this.robots.set(origin, rules);
    return rules;
  }

  private async waitPoliteDelay(url: string, siteDelayMs: number): Promise<void> {
    const host = hostOf(url);
    const required = Math.max(this.config.delayMs, siteDelayMs);
    const last = this.lastRequestAt.get(host);
    if (last !== undefined) {
      const wait = required - (this.now() - last);
      if (wait > 0) await this.sleep(wait, this.runAbort.signal);
    }
    this.lastRequestAt.set(host, this.now());
  }

  private async timedFetch(url: string): Promise<FetchResult> {
    const controller = new AbortController();
    const abort = (): void => controller.abort();
    if (this.runAbort.signal.aborted) controller.abort();
    this.runAbort.signal.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(abort, this.timeoutMs);
    try {
      return await this.deps.fetcher.fetch(url, controller.signal);
    } finally {
      clearTimeout(timer);
      this.runAbort.signal.removeEventListener('abort', abort);
    }
  }

  private async waitWhilePaused(): Promise<void> {
    while (this.state === 'paused' && !this.stopRequested) {
      await new Promise<void>((resolve) => this.resumeWaiters.push(resolve));
    }
  }

  private flushWaiters(): void {
    const waiters = this.resumeWaiters;
    this.resumeWaiters = [];
    waiters.forEach((resolve) => resolve());
  }

  // ----------------------------------------------------------------- estado

  private skip(message: string): void {
    this.counters.skipped++;
    this.addLog('warn', message);
  }

  private addLog(level: CrawlLogEntry['level'], message: string): void {
    const entry: CrawlLogEntry = { id: this.nextLogId++, time: this.now(), level, message };
    this.log = [...this.log.slice(-(MAX_LOG_ENTRIES - 1)), entry];
    this.emit();
  }

  private buildSnapshot(): CrawlSnapshot {
    return {
      state: this.state,
      stats: { ...this.counters, queued: this.frontier.length - this.head },
      currentUrl: this.currentUrl,
      log: this.log,
    };
  }

  private emit(): void {
    this.snapshotValue = this.buildSnapshot();
    this.listeners.forEach((listener) => listener());
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
