import { PageNotFoundError, ValidationError } from './errors';
import { DocumentRepository } from './index/DocumentRepository';
import { InvertedIndex } from './index/InvertedIndex';
import { PageAnalyzer } from './index/PageAnalyzer';
import { Searcher } from './index/Searcher';
import { validatePageInput } from './index/validatePageInput';
import { Tokenizer } from './text/Tokenizer';
import { Trie } from './tree/Trie';
import { normalizeUrl } from './url';
import type { TreeViewNode, TreeViewOptions } from './tree/TreeView';
import type {
  EngineStats,
  Page,
  PageInput,
  SearchOptions,
  SearchResponse,
  TermSuggestion,
} from './types';

export interface SearchEngineOptions {
  tokenizer?: Tokenizer;
  /** Relógio injetável (facilita testes). */
  now?: () => number;
}

/**
 * Fachada do buscador. Coordena:
 * - `DocumentRepository` (AVL): guarda as páginas por id;
 * - `InvertedIndex` (Trie): termo -> páginas;
 * - `Searcher`: consulta e ranking.
 *
 * Toda mutação valida e analisa os dados ANTES de tocar nas árvores, então uma
 * entrada inválida nunca deixa o índice pela metade.
 */
export class SearchEngine {
  private readonly tokenizer: Tokenizer;
  private readonly now: () => number;
  private readonly analyzer: PageAnalyzer;
  private readonly index = new InvertedIndex();
  private readonly repository = new DocumentRepository();
  /** URL normalizada -> id da página. Evita duplicatas e permite achar uma página pela URL em O(m). */
  private readonly urlIndex = new Trie<number>();
  private readonly searcher: Searcher;

  private readonly listeners = new Set<() => void>();
  private version = 0;

  constructor(options: SearchEngineOptions = {}) {
    this.tokenizer = options.tokenizer ?? new Tokenizer();
    this.now = options.now ?? Date.now;
    this.analyzer = new PageAnalyzer(this.tokenizer);
    this.searcher = new Searcher(this.tokenizer, this.index, this.repository);
  }

  // ------------------------------------------------------------- escrita

  addPage(input: PageInput): Page {
    const { clean, termWeights } = this.prepare(input);
    const urlKey = SearchEngine.urlKey(clean.url);
    if (this.urlIndex.has(urlKey)) throw duplicateUrlError();

    const timestamp = this.now();
    const page: Page = {
      ...clean,
      id: this.repository.allocateId(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.index.addDocument(page.id, termWeights);
    this.repository.put({ page, termWeights });
    this.urlIndex.set(urlKey, page.id);
    this.notify();
    return page;
  }

  /**
   * Indexa a página; se já existir uma com a mesma URL, atualiza essa.
   * É o que o crawler usa, para que coletar de novo não gere duplicatas.
   */
  upsertPage(input: PageInput): { page: Page; created: boolean } {
    const existing = this.findPageByUrl(input.url);
    if (existing === undefined) return { page: this.addPage(input), created: true };
    return { page: this.updatePage(existing.id, input), created: false };
  }

  /** Edita os campos informados e reindexa a página. */
  updatePage(id: number, changes: Partial<PageInput>): Page {
    const current = this.repository.get(id);
    if (current === undefined) throw new PageNotFoundError(id);

    const { clean, termWeights } = this.prepare({
      title: changes.title ?? current.page.title,
      url: changes.url ?? current.page.url,
      content: changes.content ?? current.page.content,
      keywords: changes.keywords ?? current.page.keywords,
    });
    const oldUrlKey = SearchEngine.urlKey(current.page.url);
    const newUrlKey = SearchEngine.urlKey(clean.url);
    if (newUrlKey !== oldUrlKey && this.urlIndex.has(newUrlKey)) throw duplicateUrlError();

    const page: Page = {
      ...clean,
      id,
      createdAt: current.page.createdAt,
      updatedAt: this.now(),
    };
    if (newUrlKey !== oldUrlKey) {
      this.urlIndex.delete(oldUrlKey);
      this.urlIndex.set(newUrlKey, id);
    }
    this.index.removeDocument(id, current.termWeights.keys());
    this.index.addDocument(id, termWeights);
    this.repository.put({ page, termWeights });
    this.notify();
    return page;
  }

  /** Remove a página do índice. Retorna `false` se ela não existia. */
  removePage(id: number): boolean {
    const record = this.repository.get(id);
    if (record === undefined) return false;
    this.index.removeDocument(id, record.termWeights.keys());
    this.repository.remove(id);
    this.urlIndex.delete(SearchEngine.urlKey(record.page.url));
    this.notify();
    return true;
  }

  // ------------------------------------------------------------- leitura

  getPage(id: number): Page | undefined {
    return this.repository.get(id)?.page;
  }

  /** Busca uma página pela URL (comparada já normalizada). */
  findPageByUrl(url: string): Page | undefined {
    const id = this.urlIndex.get(SearchEngine.urlKey(url.trim()));
    return id === undefined ? undefined : this.getPage(id);
  }

  /** Todas as páginas em ordem crescente de id. */
  listPages(): Page[] {
    return this.repository.list().map((record) => record.page);
  }

  search(query: string, options?: SearchOptions): SearchResponse {
    return this.searcher.search(query, options);
  }

  /** Termos do índice que começam com `prefix` (autocompletar). */
  suggest(prefix: string, limit = 8): TermSuggestion[] {
    return this.index.suggest(this.tokenizer.normalize(prefix).trim(), limit);
  }

  stats(): EngineStats {
    return {
      pageCount: this.repository.size,
      termCount: this.index.termCount,
      trieNodeCount: this.index.nodeCount,
      trieHeight: this.index.trieHeight(),
      avlHeight: this.repository.height,
    };
  }

  /** Visualização da Trie de termos (opcionalmente restrita a um prefixo). */
  termTreeView(options: TreeViewOptions & { prefix?: string } = {}): TreeViewNode | null {
    const prefix = options.prefix === undefined ? undefined : this.tokenizer.normalize(options.prefix).trim();
    return this.index.toTreeView(prefix === undefined || prefix === '' ? stripPrefix(options) : { ...options, prefix });
  }

  /** Visualização da AVL de páginas. */
  documentTreeView(maxDepth?: number): TreeViewNode | null {
    return this.repository.toTreeView(maxDepth);
  }

  // ---------------------------------------------- observação (para a UI)

  /** Compatível com `useSyncExternalStore`: referência estável. */
  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** Incrementa a cada mutação. Compatível com `useSyncExternalStore`. */
  readonly getVersion = (): number => this.version;

  // ------------------------------------------------------------- internos

  private static urlKey(url: string): string {
    return normalizeUrl(url) ?? url;
  }

  private prepare(input: PageInput): { clean: PageInput; termWeights: Map<string, number> } {
    const clean = validatePageInput(input);
    const termWeights = this.analyzer.analyze(clean);
    if (termWeights.size === 0) {
      throw new ValidationError(
        'A página não tem termos indexáveis. Use um título, conteúdo ou palavras-chave com letras ou números.',
      );
    }
    return { clean, termWeights };
  }

  private notify(): void {
    this.version++;
    this.listeners.forEach((listener) => listener());
  }
}

function duplicateUrlError(): ValidationError {
  return new ValidationError('Já existe uma página com esta URL.', 'url');
}

function stripPrefix(options: TreeViewOptions & { prefix?: string }): TreeViewOptions {
  const { prefix: _ignored, ...rest } = options;
  return rest;
}
