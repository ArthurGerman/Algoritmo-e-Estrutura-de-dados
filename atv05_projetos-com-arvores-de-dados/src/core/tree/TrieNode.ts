/**
 * Nó da Trie. Cada nó guarda um ponteiro para cada caractere distinto que
 * pode vir a seguir (no máximo |alfabeto| ponteiros) e, opcionalmente, o valor
 * associado à chave que termina nele.
 *
 * `entry` é uma "caixa" ({ value }) para distinguir "sem chave aqui" de
 * "chave com valor undefined".
 */
export class TrieNode<V> {
  private readonly edges = new Map<string, TrieNode<V>>();
  entry: { value: V } | null = null;

  get isTerminal(): boolean {
    return this.entry !== null;
  }

  get childCount(): number {
    return this.edges.size;
  }

  get hasChildren(): boolean {
    return this.edges.size > 0;
  }

  child(symbol: string): TrieNode<V> | undefined {
    return this.edges.get(symbol);
  }

  addChild(symbol: string): TrieNode<V> {
    const node = new TrieNode<V>();
    this.edges.set(symbol, node);
    return node;
  }

  removeChild(symbol: string): boolean {
    return this.edges.delete(symbol);
  }

  /** Filhos sem ordem definida (para percursos que não dependem da ordem). */
  children(): IterableIterator<TrieNode<V>> {
    return this.edges.values();
  }

  /** Arestas em ordem alfabética (garante percursos determinísticos). */
  sortedEdges(): Array<[string, TrieNode<V>]> {
    return [...this.edges].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  }
}
