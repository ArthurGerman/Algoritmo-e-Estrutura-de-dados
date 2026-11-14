import { ValidationError } from '../errors';
import { normalizeUrl } from '../url';

export interface CrawlConfig {
  readonly seeds: readonly string[];
  /** Máximo de páginas indexadas (novas + atualizadas). */
  readonly maxPages: number;
  /** Distância máxima das sementes, em cliques (0 = só as sementes). */
  readonly maxDepth: number;
  /** Pausa mínima entre requisições ao mesmo site. */
  readonly delayMs: number;
  /** Só segue links para os mesmos sites das sementes. */
  readonly sameHostOnly: boolean;
}

export interface CrawlConfigInput {
  seeds: readonly string[];
  maxPages?: number;
  maxDepth?: number;
  delayMs?: number;
  sameHostOnly?: boolean;
}

/** Limites rígidos: protegem os sites visitados e o navegador do usuário. */
export const CRAWL_LIMITS = {
  maxPages: { min: 1, max: 500 },
  maxDepth: { min: 0, max: 5 },
  delayMs: { min: 100, max: 10_000 },
} as const;

export const DEFAULT_CRAWL_SETTINGS = {
  maxPages: 30,
  maxDepth: 2,
  delayMs: 300,
  sameHostOnly: true,
} as const;

function clamp(value: number | undefined, fallback: number, limits: { min: number; max: number }): number {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.min(limits.max, Math.max(limits.min, Math.floor(value)));
}

/** Valida e normaliza a configuração: sementes http(s) únicas e números dentro dos limites. */
export function normalizeCrawlConfig(input: CrawlConfigInput): CrawlConfig {
  const seeds = [
    ...new Set(input.seeds.map((seed) => normalizeUrl(seed)).filter((url): url is string => url !== null)),
  ];
  if (seeds.length === 0) {
    throw new ValidationError('Informe ao menos uma URL http(s) válida para começar.', 'seeds');
  }
  return {
    seeds,
    maxPages: clamp(input.maxPages, DEFAULT_CRAWL_SETTINGS.maxPages, CRAWL_LIMITS.maxPages),
    maxDepth: clamp(input.maxDepth, DEFAULT_CRAWL_SETTINGS.maxDepth, CRAWL_LIMITS.maxDepth),
    delayMs: clamp(input.delayMs, DEFAULT_CRAWL_SETTINGS.delayMs, CRAWL_LIMITS.delayMs),
    sameHostOnly: input.sameHostOnly ?? DEFAULT_CRAWL_SETTINGS.sameHostOnly,
  };
}
