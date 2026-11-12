/** Dados fornecidos pelo usuário ao cadastrar ou editar uma página. */
export interface PageInput {
  title: string;
  url: string;
  content: string;
  keywords: readonly string[];
}

/** Página já cadastrada no índice. */
export interface Page extends PageInput {
  readonly id: number;
  readonly createdAt: number;
  readonly updatedAt: number;
}

/**
 * Registro guardado na árvore de documentos: a página e os termos com que ela
 * foi indexada. Guardar os termos permite desfazer a indexação (remoção e
 * edição) sem varrer o índice inteiro.
 */
export interface IndexedPage {
  readonly page: Page;
  readonly termWeights: ReadonlyMap<string, number>;
}

export type SearchMode = 'all' | 'any';

export interface SearchOptions {
  /** `all`: a página precisa conter todos os termos (E). `any`: basta um (OU). Padrão: `all`. */
  mode?: SearchMode;
  /** Trata a última palavra da consulta como prefixo (busca enquanto digita). Padrão: false. */
  prefixLastTerm?: boolean;
  /** Máximo de resultados devolvidos. Padrão: 20. */
  limit?: number;
}

export interface SearchHit {
  page: Page;
  score: number;
  /** Termos indexados que casaram com a consulta (inclui expansões de prefixo). */
  matchedTerms: string[];
}

export interface SearchResponse {
  query: string;
  /** Termos da consulta depois de normalização e remoção de stop words. */
  terms: string[];
  hits: SearchHit[];
  /** Total de páginas que casaram, antes de aplicar `limit`. */
  totalHits: number;
  elapsedMs: number;
}

export interface TermSuggestion {
  term: string;
  /** Em quantas páginas o termo aparece. */
  documentFrequency: number;
}

export interface EngineStats {
  pageCount: number;
  termCount: number;
  trieNodeCount: number;
  trieHeight: number;
  avlHeight: number;
}
