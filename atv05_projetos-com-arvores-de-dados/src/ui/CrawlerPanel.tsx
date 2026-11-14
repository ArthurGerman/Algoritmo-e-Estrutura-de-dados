import { useEffect, useState } from 'react';
import {
  CRAWL_LIMITS,
  Crawler,
  DEFAULT_CRAWL_SETTINGS,
  EngineCrawlSink,
  normalizeCrawlConfig,
  ValidationError,
  type CrawlState,
  type SearchEngine,
} from '../core';
import { BrowserFetcher } from '../app/BrowserFetcher';
import { useCrawlSnapshot } from './useCrawlSnapshot';

const STATE_LABEL: Record<CrawlState, string> = {
  idle: 'Parado',
  running: 'Coletando',
  paused: 'Pausado',
  stopping: 'Parando…',
  stopped: 'Interrompido',
  finished: 'Concluído',
};

const fetcher = new BrowserFetcher();

/** Campo vazio ou inválido vira `undefined` (usa o padrão), em vez de 0. */
function numberOrUndefined(text: string): number | undefined {
  return text.trim() === '' ? undefined : Number(text);
}

/** Aceita "exemplo.com" sem o esquema, assumindo https. */
function withScheme(seed: string): string {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(seed) ? seed : `https://${seed}`;
}

export function CrawlerPanel({ engine }: { engine: SearchEngine }) {
  const [seeds, setSeeds] = useState('');
  const [maxPages, setMaxPages] = useState(String(DEFAULT_CRAWL_SETTINGS.maxPages));
  const [maxDepth, setMaxDepth] = useState(String(DEFAULT_CRAWL_SETTINGS.maxDepth));
  const [delayMs, setDelayMs] = useState(String(DEFAULT_CRAWL_SETTINGS.delayMs));
  const [sameHostOnly, setSameHostOnly] = useState<boolean>(DEFAULT_CRAWL_SETTINGS.sameHostOnly);
  const [error, setError] = useState<string | null>(null);
  const [crawler, setCrawler] = useState<Crawler | null>(null);
  const snapshot = useCrawlSnapshot(crawler);

  // Ao sair da tela (ou trocar de coleta), interrompe a que estiver em andamento.
  useEffect(() => () => crawler?.stop(), [crawler]);

  const { state, stats } = snapshot;
  const active = state === 'running' || state === 'paused' || state === 'stopping';

  const start = (): void => {
    try {
      const config = normalizeCrawlConfig({
        seeds: seeds.split(/\s+/).filter((line) => line !== '').map(withScheme),
        maxPages: numberOrUndefined(maxPages),
        maxDepth: numberOrUndefined(maxDepth),
        delayMs: numberOrUndefined(delayMs),
        sameHostOnly,
      });
      const next = new Crawler(config, { fetcher, sink: new EngineCrawlSink(engine) });
      setError(null);
      setCrawler(next);
      void next.start();
    } catch (cause) {
      if (cause instanceof ValidationError) setError(cause.message);
      else throw cause;
    }
  };

  const useDemoSite = (): void => setSeeds(`${window.location.origin}/demo/index.html`);

  return (
    <section aria-labelledby="crawler-title">
      <h2 id="crawler-title">Coleta automática (crawler)</h2>
      <p className="muted">
        Segue links a partir das URLs iniciais e indexa o que encontra. Respeita o robots.txt, as metas
        noindex/nofollow e espera entre as requisições.
      </p>

      <label>
        URLs iniciais (uma por linha)
        <textarea
          rows={3}
          value={seeds}
          disabled={active}
          onChange={(event) => setSeeds(event.target.value)}
          placeholder="https://exemplo.com/"
        />
      </label>

      <div className="row">
        <label>
          Máx. páginas ({CRAWL_LIMITS.maxPages.min}–{CRAWL_LIMITS.maxPages.max})
          <input type="number" value={maxPages} disabled={active} onChange={(event) => setMaxPages(event.target.value)} />
        </label>
        <label>
          Profundidade ({CRAWL_LIMITS.maxDepth.min}–{CRAWL_LIMITS.maxDepth.max})
          <input type="number" value={maxDepth} disabled={active} onChange={(event) => setMaxDepth(event.target.value)} />
        </label>
        <label>
          Pausa entre requisições (ms)
          <input type="number" value={delayMs} disabled={active} onChange={(event) => setDelayMs(event.target.value)} />
        </label>
      </div>
      <div className="row">
        <label>
          <input
            type="checkbox"
            checked={sameHostOnly}
            disabled={active}
            onChange={(event) => setSameHostOnly(event.target.checked)}
          />{' '}
          Ficar nos sites das URLs iniciais
        </label>
        <button type="button" disabled={active} onClick={useDemoSite}>
          Usar site de demonstração
        </button>
      </div>

      {error !== null && (
        <p role="alert" className="error">
          {error}
        </p>
      )}

      <div className="row">
        {!active && (
          <button type="button" onClick={start}>
            Iniciar coleta
          </button>
        )}
        {state === 'running' && (
          <button type="button" onClick={() => crawler?.pause()}>
            Pausar
          </button>
        )}
        {state === 'paused' && (
          <button type="button" onClick={() => crawler?.resume()}>
            Continuar
          </button>
        )}
        {(state === 'running' || state === 'paused') && (
          <button type="button" onClick={() => crawler?.stop()}>
            Parar
          </button>
        )}
        <strong>{STATE_LABEL[state]}</strong>
      </div>

      <p className="muted">
        Na fila: {stats.queued} · requisitadas: {stats.requested} · novas: {stats.added} · atualizadas:{' '}
        {stats.updated} · ignoradas: {stats.skipped} · erros: {stats.errors}
      </p>
      {snapshot.currentUrl !== null && active && <p className="muted">Visitando: {snapshot.currentUrl}</p>}

      <ul className="log" aria-label="Registro da coleta">
        {[...snapshot.log].reverse().slice(0, 50).map((entry) => (
          <li key={entry.id} className={entry.level}>
            {entry.message}
          </li>
        ))}
      </ul>
    </section>
  );
}
