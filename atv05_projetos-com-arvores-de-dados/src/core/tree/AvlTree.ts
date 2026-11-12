import { DEFAULT_VIEW, type TreeViewNode } from './TreeView';

export type Comparator<K> = (a: K, b: K) => number;

/**
 * Nó da árvore AVL: 2 ponteiros (esquerda e direita) + altura do nó.
 * Mantemos a altura em cada nó para calcular o fator de balanceamento em O(1).
 */
class AvlNode<K, V> {
  height = 1;
  left: AvlNode<K, V> | null = null;
  right: AvlNode<K, V> | null = null;

  constructor(
    public key: K,
    public value: V,
  ) {}
}

/**
 * Árvore AVL (árvore binária de busca auto-balanceada) genérica.
 *
 * Regra de inclusão: chaves MENORES vão para a subárvore esquerda e chaves
 * MAIORES para a direita. Após cada inserção/remoção, o caminho até a raiz é
 * reavaliado e, se a diferença de altura entre as subárvores de um nó passar
 * de 1, rotações restauram o equilíbrio.
 *
 * Complexidade: busca, inserção e remoção em O(log n) no pior caso.
 */
export class AvlTree<K, V> implements Iterable<[K, V]> {
  private root: AvlNode<K, V> | null = null;
  private count = 0;

  constructor(private readonly compare: Comparator<K>) {}

  /** Quantidade de chaves armazenadas. */
  get size(): number {
    return this.count;
  }

  /** Altura da árvore (0 quando vazia). */
  get height(): number {
    return AvlTree.heightOf(this.root);
  }

  /** Insere a chave ou, se ela já existir, substitui o valor. */
  set(key: K, value: V): void {
    this.root = this.insertNode(this.root, key, value);
  }

  get(key: K): V | undefined {
    return this.findNode(key)?.value;
  }

  has(key: K): boolean {
    return this.findNode(key) !== null;
  }

  /** Remove a chave. Retorna `true` se ela existia. */
  delete(key: K): boolean {
    const before = this.count;
    this.root = this.removeNode(this.root, key);
    return this.count < before;
  }

  min(): [K, V] | undefined {
    if (this.root === null) return undefined;
    const node = AvlTree.leftmost(this.root);
    return [node.key, node.value];
  }

  max(): [K, V] | undefined {
    let node = this.root;
    if (node === null) return undefined;
    while (node.right !== null) node = node.right;
    return [node.key, node.value];
  }

  /** Percurso em ordem (esquerda, nó, direita): chaves em ordem crescente. */
  *entries(): Generator<[K, V], void, undefined> {
    const stack: Array<AvlNode<K, V>> = [];
    let current = this.root;
    while (current !== null || stack.length > 0) {
      while (current !== null) {
        stack.push(current);
        current = current.left;
      }
      const node = stack.pop();
      if (node === undefined) return;
      yield [node.key, node.value];
      current = node.right;
    }
  }

  *keys(): Generator<K, void, undefined> {
    for (const [key] of this.entries()) yield key;
  }

  *values(): Generator<V, void, undefined> {
    for (const [, value] of this.entries()) yield value;
  }

  [Symbol.iterator](): Generator<[K, V], void, undefined> {
    return this.entries();
  }

  /**
   * Converte a árvore para um formato visual.
   * `describe` define como cada nó é exibido (rótulo e detalhe).
   */
  toTreeView(
    describe: (key: K, value: V) => { label: string; detail?: string },
    maxDepth: number = DEFAULT_VIEW.maxDepth,
  ): TreeViewNode | null {
    const build = (
      node: AvlNode<K, V>,
      edge: string | undefined,
      depthLeft: number,
    ): TreeViewNode => {
      const { label, detail } = describe(node.key, node.value);
      const view: TreeViewNode = {
        label,
        edge,
        detail: detail === undefined ? `h=${node.height}` : `${detail} · h=${node.height}`,
        terminal: true,
        children: [],
      };
      if (node.left === null && node.right === null) return view;
      if (depthLeft <= 0) {
        view.truncated = true;
        return view;
      }
      if (node.left !== null) view.children.push(build(node.left, 'esq', depthLeft - 1));
      if (node.right !== null) view.children.push(build(node.right, 'dir', depthLeft - 1));
      return view;
    };
    return this.root === null ? null : build(this.root, undefined, maxDepth);
  }

  /**
   * Verifica os invariantes da AVL e lança erro descritivo se algum falhar:
   * (1) chaves em ordem estritamente crescente; (2) |fator de balanceamento| <= 1;
   * (3) alturas armazenadas corretas; (4) contador de tamanho consistente.
   */
  checkInvariants(): void {
    let previous: K | undefined;
    let visited = 0;
    for (const key of this.keys()) {
      if (visited > 0 && previous !== undefined && this.compare(previous, key) >= 0) {
        throw new Error('Invariante violado: chaves fora de ordem crescente.');
      }
      previous = key;
      visited++;
    }
    if (visited !== this.count) {
      throw new Error(`Invariante violado: size=${this.count}, mas há ${visited} nós.`);
    }
    const check = (node: AvlNode<K, V> | null): number => {
      if (node === null) return 0;
      const leftHeight = check(node.left);
      const rightHeight = check(node.right);
      if (Math.abs(leftHeight - rightHeight) > 1) {
        throw new Error('Invariante violado: nó desbalanceado.');
      }
      const expected = 1 + Math.max(leftHeight, rightHeight);
      if (node.height !== expected) {
        throw new Error('Invariante violado: altura armazenada incorreta.');
      }
      return expected;
    };
    check(this.root);
  }

  // ---------------------------------------------------------------- internos

  private findNode(key: K): AvlNode<K, V> | null {
    let node = this.root;
    while (node !== null) {
      const order = this.compare(key, node.key);
      if (order === 0) return node;
      node = order < 0 ? node.left : node.right;
    }
    return null;
  }

  private insertNode(node: AvlNode<K, V> | null, key: K, value: V): AvlNode<K, V> {
    if (node === null) {
      this.count++;
      return new AvlNode(key, value);
    }
    const order = this.compare(key, node.key);
    if (order < 0) {
      node.left = this.insertNode(node.left, key, value);
    } else if (order > 0) {
      node.right = this.insertNode(node.right, key, value);
    } else {
      node.value = value;
      return node;
    }
    return this.rebalance(node);
  }

  private removeNode(node: AvlNode<K, V> | null, key: K): AvlNode<K, V> | null {
    if (node === null) return null;
    const order = this.compare(key, node.key);
    if (order < 0) {
      node.left = this.removeNode(node.left, key);
    } else if (order > 0) {
      node.right = this.removeNode(node.right, key);
    } else {
      this.count--;
      if (node.left === null) return node.right;
      if (node.right === null) return node.left;
      // Dois filhos: o sucessor em ordem (menor da direita) ocupa o lugar do nó.
      const successor = AvlTree.leftmost(node.right);
      node.key = successor.key;
      node.value = successor.value;
      node.right = this.removeLeftmost(node.right);
    }
    return this.rebalance(node);
  }

  private removeLeftmost(node: AvlNode<K, V>): AvlNode<K, V> | null {
    if (node.left === null) return node.right;
    node.left = this.removeLeftmost(node.left);
    return this.rebalance(node);
  }

  private rebalance(node: AvlNode<K, V>): AvlNode<K, V> {
    AvlTree.refreshHeight(node);
    const balance = AvlTree.balanceFactor(node);

    if (balance > 1) {
      // Pesada à esquerda. Caso esquerda-direita: rotação dupla.
      if (node.left !== null && AvlTree.balanceFactor(node.left) < 0) {
        node.left = AvlTree.rotateLeft(node.left);
      }
      return AvlTree.rotateRight(node);
    }
    if (balance < -1) {
      // Pesada à direita. Caso direita-esquerda: rotação dupla.
      if (node.right !== null && AvlTree.balanceFactor(node.right) > 0) {
        node.right = AvlTree.rotateRight(node.right);
      }
      return AvlTree.rotateLeft(node);
    }
    return node;
  }

  private static heightOf<K, V>(node: AvlNode<K, V> | null): number {
    return node === null ? 0 : node.height;
  }

  private static balanceFactor<K, V>(node: AvlNode<K, V>): number {
    return AvlTree.heightOf(node.left) - AvlTree.heightOf(node.right);
  }

  private static refreshHeight<K, V>(node: AvlNode<K, V>): void {
    node.height = 1 + Math.max(AvlTree.heightOf(node.left), AvlTree.heightOf(node.right));
  }

  private static leftmost<K, V>(node: AvlNode<K, V>): AvlNode<K, V> {
    let current = node;
    while (current.left !== null) current = current.left;
    return current;
  }

  private static rotateRight<K, V>(y: AvlNode<K, V>): AvlNode<K, V> {
    const x = y.left;
    if (x === null) return y;
    y.left = x.right;
    x.right = y;
    AvlTree.refreshHeight(y);
    AvlTree.refreshHeight(x);
    return x;
  }

  private static rotateLeft<K, V>(x: AvlNode<K, V>): AvlNode<K, V> {
    const y = x.right;
    if (y === null) return x;
    x.right = y.left;
    y.left = x;
    AvlTree.refreshHeight(x);
    AvlTree.refreshHeight(y);
    return y;
  }
}
