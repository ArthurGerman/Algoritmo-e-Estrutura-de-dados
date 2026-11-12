# Buscador Web: índice em árvores (TypeScript + React)

Buscador com infraestrutura de indexação **implementada do zero**: nenhuma biblioteca de árvores, crawlers ou motores de busca. React é usado apenas na interface.

## Como rodar

```bash
npm install
npm run dev        # interface em http://localhost:5173
npm test           # 51 testes (AVL, Trie, tokenizador, buscador)
npm run typecheck  # TypeScript estrito
```

## Duas árvores, duas funções

| Estrutura | Arquivo | Papel | Chave -> valor |
|---|---|---|---|
| **Trie** | `src/core/tree/Trie.ts` | Dicionário do índice invertido | termo -> páginas que o contêm |
| **AVL** | `src/core/tree/AvlTree.ts` | Repositório de páginas | id da página -> página |

### Por que Trie para o índice
A operação mais frequente de um buscador é **achar um termo**. Na Trie isso custa **O(m)** (m = tamanho da palavra), independente de quantos termos existem. Uma BST/AVL de strings custaria O(m · log n), porque cada comparação lê a string. A Trie também dá, de graça, **busca por prefixo** (autocompletar e "buscar enquanto digita"), algo que árvores de comparação e tabelas hash não oferecem.

### Por que AVL para as páginas
Ids são inseridos em ordem crescente, o pior caso de uma BST comum (vira lista, O(n)). A AVL se rebalança com rotações e garante **O(log n)** para busca, inserção e remoção.

## Regras de cada árvore (para os slides)

**Trie**
- Cada aresta é um caractere; o caminho da raiz até um nó é um prefixo.
- Inclusão: percorre a palavra criando os nós que faltam; o último nó guarda a lista de páginas.
- Ponteiros por nó: um por caractere distinto que pode seguir (até |alfabeto|; aqui `a-z` e `0-9`, ou seja, até 36).
- Remoção: apaga o valor do último nó e **poda** os nós que ficaram sem valor e sem filhos.

**AVL**
- Chaves **menores** vão para a esquerda, **maiores** para a direita.
- 2 ponteiros por nó (esquerda e direita) + a altura do nó.
- Invariante: a diferença de altura entre as subárvores de qualquer nó é no máximo 1.
- Rotações: simples (esquerda ou direita) e duplas (esquerda-direita e direita-esquerda).

## Complexidade

| Operação | Trie (m = tamanho do termo) | AVL (n = páginas) |
|---|---|---|
| Buscar | O(m) | O(log n) |
| Inserir | O(m) | O(log n) |
| Remover | O(m) | O(log n) |
| Listar por prefixo | O(m + k), k = resultados | n/a |

Indexar uma página com T termos distintos custa O(T · m). Uma consulta com q termos custa a soma das listas de páginas dos termos (interseção iterando a menor lista).

## Como a busca funciona

1. **Tokenização** (`Tokenizer`): minúsculas, sem acentos, separa por pontuação, descarta stop words e tokens de 1 letra. O mesmo tokenizador é usado ao indexar e ao consultar.
2. **Peso por campo** (`PageAnalyzer`): ocorrência em palavra-chave vale 3, no título 2, no conteúdo 1.
3. **Consulta** (`Searcher`): para cada termo, busca na Trie. Modo **todas** (E) intersecta as listas; modo **qualquer** (OU) une.
4. **Ranking**: TF-IDF com tf suavizado: `(1 + ln(peso)) · ln(1 + N/df)`. Termos raros pontuam mais.
5. **Prefixo**: a última palavra pode ser tratada como prefixo, expandida pela Trie.

## Organização do código

```
src/core/                 núcleo (sem dependência de React)
  tree/   Trie, TrieNode, AvlTree, TreeView
  text/   Tokenizer
  index/  InvertedIndex, DocumentRepository, PageAnalyzer, Searcher, validatePageInput
  SearchEngine.ts         fachada: addPage, updatePage, removePage, search, suggest, stats
  seed/                   17 páginas de exemplo para a demonstração
src/ui/ e App.tsx        interface mínima (busca, cadastro/edição/remoção, visualização das árvores)
tests/                    Vitest
```

O `SearchEngine` valida e analisa a entrada **antes** de tocar nas árvores: uma página inválida nunca deixa o índice pela metade. As árvores têm `checkInvariants()` (ordem, balanceamento, alturas), usado nos testes aleatórios contra um `Map` de referência.

## O que falta (próximos passos)

- Crawler simples (ponto extra do enunciado) com painel de controle. Rodar no navegador esbarra em CORS, então o ideal é um script Node ou um pequeno servidor, também sem bibliotecas de crawling.
- Persistência opcional (exportar/importar JSON) e, se sobrar tempo, destaque dos termos nos resultados.
- Polimento da interface.
