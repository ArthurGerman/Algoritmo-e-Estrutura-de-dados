import { Trie } from '../tree/Trie';
import type { TreeViewNode, TreeViewOptions } from '../tree/TreeView';
import type { TermSuggestion } from '../types';

/** Para cada termo: id da página -> peso do termo naquela página. */
export type Postings = Map<number, number>;

/**
 * Índice invertido: termo -> páginas que o contêm.
 * O dicionário de termos é uma Trie, o que dá busca exata em O(m) e
 * busca por prefixo (autocompletar) sem varrer o vocabulário inteiro.
 */
export class InvertedIndex {
  private readonly trie = new Trie<Postings>();

  get termCount(): number {
    return this.trie.size;
  }

  get nodeCount(): number {
    return this.trie.nodeCount;
  }

  trieHeight(): number {
    return this.trie.height();
  }

  addDocument(docId: number, termWeights: ReadonlyMap<string, number>): void {
    for (const [term, weight] of termWeights) {
      this.trie.upsert(term, (postings) => {
        const next = postings ?? new Map<number, number>();
        next.set(docId, weight);
        return next;
      });
    }
  }

  /** Remove a página dos termos informados e apaga da Trie os termos que ficaram sem páginas. */
  removeDocument(docId: number, terms: Iterable<string>): void {
    for (const term of terms) {
      const postings = this.trie.get(term);
      if (postings === undefined) continue;
      postings.delete(docId);
      if (postings.size === 0) this.trie.delete(term);
    }
  }

  postings(term: string): ReadonlyMap<number, number> | undefined {
    return this.trie.get(term);
  }

  documentFrequency(term: string): number {
    return this.trie.get(term)?.size ?? 0;
  }

  /** Termos que começam com `prefix` e suas listas de páginas, em ordem alfabética. */
  matchPrefix(prefix: string): Array<[string, ReadonlyMap<number, number>]> {
    return this.trie.findByPrefix(prefix);
  }

  /** Termos que começam com `prefix`, os mais frequentes primeiro. */
  suggest(prefix: string, limit: number): TermSuggestion[] {
    if (prefix === '' || limit <= 0) return [];
    return this.trie
      .findByPrefix(prefix)
      .map(([term, postings]) => ({ term, documentFrequency: postings.size }))
      .sort((a, b) => b.documentFrequency - a.documentFrequency || a.term.localeCompare(b.term))
      .slice(0, limit);
  }

  toTreeView(options: TreeViewOptions & { prefix?: string } = {}): TreeViewNode | null {
    return this.trie.toTreeView({
      ...options,
      describe: (postings) => (postings.size === 1 ? '1 página' : `${postings.size} páginas`),
    });
  }
}
