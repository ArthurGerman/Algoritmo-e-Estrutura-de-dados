import { TrieNode } from './TrieNode';
import { DEFAULT_VIEW, type TreeViewNode, type TreeViewOptions } from './TreeView';

export interface TrieViewOptions<V> extends TreeViewOptions {
  /** Exibe somente a subárvore de chaves que começam com este prefixo. */
  prefix?: string;
  /** Texto de detalhe exibido nos nós que terminam uma chave. */
  describe?: (value: V) => string;
}

const ROOT_LABEL = '(raiz)';

/**
 * Trie (árvore de prefixos) genérica: chave string -> valor.
 *
 * Regra de inclusão: cada caractere da chave é uma aresta; o caminho da raiz
 * até um nó é um prefixo. Chaves com prefixo comum compartilham o caminho.
 *
 * Complexidade (m = tamanho da chave): inserir, buscar e remover em O(m),
 * independentemente de quantas chaves existem. Listar as chaves com um prefixo
 * custa O(m + tamanho da resposta).
 */
export class Trie<V> implements Iterable<[string, V]> {
  private readonly root = new TrieNode<V>();
  private keyCount = 0;
  private nodes = 1; // a raiz conta

  /** Quantidade de chaves armazenadas. */
  get size(): number {
    return this.keyCount;
  }

  /** Quantidade de nós (incluindo a raiz). */
  get nodeCount(): number {
    return this.nodes;
  }

  /** Profundidade máxima (tamanho da maior chave). Percorre a árvore: O(nós). */
  height(): number {
    let max = 0;
    const stack: Array<[TrieNode<V>, number]> = [[this.root, 0]];
    while (stack.length > 0) {
      const frame = stack.pop();
      if (frame === undefined) break;
      const [node, depth] = frame;
      if (depth > max) max = depth;
      for (const child of node.children()) stack.push([child, depth + 1]);
    }
    return max;
  }

  /**
   * Cria ou atualiza a chave. `update` recebe o valor atual (ou undefined) e
   * devolve o novo. Se `update` lançar erro, a árvore não é alterada.
   */
  upsert(key: string, update: (current: V | undefined) => V): V {
    const symbols = Trie.symbols(key);
    if (symbols.length === 0) {
      throw new RangeError('A chave da Trie não pode ser vazia.');
    }
    const next = update(this.locate(symbols)?.entry?.value);

    let node = this.root;
    for (const symbol of symbols) {
      let child = node.child(symbol);
      if (child === undefined) {
        child = node.addChild(symbol);
        this.nodes++;
      }
      node = child;
    }
    if (node.entry === null) this.keyCount++;
    node.entry = { value: next };
    return next;
  }

  set(key: string, value: V): void {
    this.upsert(key, () => value);
  }

  get(key: string): V | undefined {
    return this.locate(Trie.symbols(key))?.entry?.value;
  }

  has(key: string): boolean {
    return this.locate(Trie.symbols(key))?.isTerminal ?? false;
  }

  /**
   * Remove a chave e poda os nós que ficaram sem utilidade (sem valor e sem
   * filhos), subindo até encontrar um nó ainda necessário. Retorna `true`
   * se a chave existia.
   */
  delete(key: string): boolean {
    const symbols = Trie.symbols(key);
    if (symbols.length === 0) return false;

    const steps: Array<{ parent: TrieNode<V>; symbol: string; node: TrieNode<V> }> = [];
    let node = this.root;
    for (const symbol of symbols) {
      const child = node.child(symbol);
      if (child === undefined) return false;
      steps.push({ parent: node, symbol, node: child });
      node = child;
    }
    if (node.entry === null) return false;

    node.entry = null;
    this.keyCount--;

    for (let i = steps.length - 1; i >= 0; i--) {
      const step = steps[i];
      if (step === undefined || step.node.isTerminal || step.node.hasChildren) break;
      step.parent.removeChild(step.symbol);
      this.nodes--;
    }
    return true;
  }

  /** Chaves (e valores) que começam com `prefix`, em ordem alfabética. */
  findByPrefix(prefix: string, limit: number = Number.POSITIVE_INFINITY): Array<[string, V]> {
    const start = this.locate(Trie.symbols(prefix));
    if (start === undefined || limit <= 0) return [];
    const result: Array<[string, V]> = [];
    for (const entry of this.walk(start, prefix)) {
      result.push(entry);
      if (result.length >= limit) break;
    }
    return result;
  }

  /** Todas as chaves em ordem alfabética. */
  entries(): Generator<[string, V], void, undefined> {
    return this.walk(this.root, '');
  }

  [Symbol.iterator](): Generator<[string, V], void, undefined> {
    return this.entries();
  }

  /**
   * Converte a Trie para um formato visual. Cadeias de nós sem ramificação e
   * sem chave são fundidas num único rótulo (ex.: "a" -> "v" -> "l" vira "avl"),
   * apenas na visualização: a estrutura real continua com um nó por caractere.
   */
  toTreeView(options: TrieViewOptions<V> = {}): TreeViewNode | null {
    const prefix = options.prefix ?? '';
    const start = this.locate(Trie.symbols(prefix));
    if (start === undefined) return null;
    const settings = {
      maxDepth: options.maxDepth ?? DEFAULT_VIEW.maxDepth,
      maxChildren: options.maxChildren ?? DEFAULT_VIEW.maxChildren,
      describe: options.describe,
    };
    return prefix === ''
      ? this.expand(start, ROOT_LABEL, settings.maxDepth, settings, false)
      : this.expand(start, prefix, settings.maxDepth, settings, true);
  }

  // ---------------------------------------------------------------- internos

  private static symbols(key: string): string[] {
    return Array.from(key); // itera por pontos de código, não por unidades UTF-16
  }

  private locate(symbols: readonly string[]): TrieNode<V> | undefined {
    let node: TrieNode<V> | undefined = this.root;
    for (const symbol of symbols) {
      node = node.child(symbol);
      if (node === undefined) return undefined;
    }
    return node;
  }

  /** Percurso em pré-ordem com pilha explícita: gera as chaves em ordem alfabética. */
  private *walk(start: TrieNode<V>, prefix: string): Generator<[string, V], void, undefined> {
    const stack: Array<{ node: TrieNode<V>; key: string }> = [{ node: start, key: prefix }];
    while (stack.length > 0) {
      const frame = stack.pop();
      if (frame === undefined) return;
      if (frame.node.entry !== null) yield [frame.key, frame.node.entry.value];
      const edges = frame.node.sortedEdges();
      for (let i = edges.length - 1; i >= 0; i--) {
        const edge = edges[i];
        if (edge !== undefined) stack.push({ node: edge[1], key: frame.key + edge[0] });
      }
    }
  }

  private expand(
    node: TrieNode<V>,
    label: string,
    depthLeft: number,
    settings: { maxChildren: number; describe: ((value: V) => string) | undefined },
    compress: boolean,
  ): TreeViewNode {
    let current = node;
    let text = label;
    if (compress) {
      while (!current.isTerminal && current.childCount === 1) {
        const only = current.sortedEdges()[0];
        if (only === undefined) break;
        text += only[0];
        current = only[1];
      }
    }

    const view: TreeViewNode = { label: text, terminal: current.isTerminal, children: [] };
    if (current.entry !== null && settings.describe !== undefined) {
      view.detail = settings.describe(current.entry.value);
    }
    if (!current.hasChildren) return view;
    if (depthLeft <= 0) {
      view.truncated = true;
      return view;
    }

    const edges = current.sortedEdges();
    for (const [symbol, child] of edges.slice(0, settings.maxChildren)) {
      view.children.push(this.expand(child, symbol, depthLeft - 1, settings, true));
    }
    if (edges.length > settings.maxChildren) view.hidden = edges.length - settings.maxChildren;
    return view;
  }
}
