/**
 * Representação neutra de uma árvore para visualização.
 * As estruturas (Trie, AVL) convertem a si mesmas para este formato,
 * assim a interface não precisa conhecer seus detalhes internos.
 */
export interface TreeViewNode {
  /** Texto do nó (na Trie, os caracteres da aresta; na AVL, a chave). */
  label: string;
  /** Rótulo da aresta que liga o nó ao pai (ex.: "esq" / "dir" na AVL). */
  edge?: string | undefined;
  /** Informação adicional (ex.: altura do nó, número de páginas do termo). */
  detail?: string | undefined;
  /** Na Trie: indica que o caminho até aqui forma uma chave armazenada. */
  terminal?: boolean | undefined;
  /** Há descendentes que não foram expandidos por causa de maxDepth. */
  truncated?: boolean | undefined;
  /** Quantidade de filhos omitidos por causa de maxChildren. */
  hidden?: number | undefined;
  children: TreeViewNode[];
}

export interface TreeViewOptions {
  /** Níveis de profundidade a expandir (padrão: 6). */
  maxDepth?: number;
  /** Máximo de filhos exibidos por nó (padrão: 12). */
  maxChildren?: number;
}

export const DEFAULT_VIEW = {
  maxDepth: 6,
  maxChildren: 12,
} as const;
