import type { SearchEngine } from '../SearchEngine';
import type { PageInput } from '../types';

/** Páginas de exemplo para demonstração (URLs fictícias). */
export const SAMPLE_PAGES: readonly PageInput[] = [
  {
    title: 'Árvore AVL',
    url: 'https://demo.local/estruturas/avl',
    keywords: ['avl', 'árvore balanceada', 'rotação', 'balanceamento'],
    content:
      'Árvore binária de busca que se mantém balanceada: a diferença de altura entre as subárvores de cada nó nunca passa de 1. Rotações simples e duplas restauram o equilíbrio após inserções e remoções, garantindo busca em O(log n).',
  },
  {
    title: 'Trie: árvore de prefixos',
    url: 'https://demo.local/estruturas/trie',
    keywords: ['trie', 'árvore de prefixos', 'autocompletar', 'prefixo'],
    content:
      'Árvore em que cada aresta representa um caractere e o caminho da raiz até um nó forma um prefixo. Busca e inserção custam O(m), onde m é o tamanho da palavra, e listar palavras por prefixo é natural. É a base de autocompletar e dicionários.',
  },
  {
    title: 'Árvore binária de busca',
    url: 'https://demo.local/estruturas/bst',
    keywords: ['árvore binária', 'bst', 'busca binária', 'ordenação'],
    content:
      'Cada nó tem até dois filhos: chaves menores ficam na subárvore esquerda e maiores na direita. O percurso em ordem devolve as chaves ordenadas. Sem balanceamento, o pior caso degenera em uma lista encadeada.',
  },
  {
    title: 'Árvore B+',
    url: 'https://demo.local/estruturas/bplus',
    keywords: ['b+', 'banco de dados', 'índice', 'disco'],
    content:
      'Árvore de busca com muitos filhos por nó, usada em bancos de dados e sistemas de arquivos. Todos os registros ficam nas folhas, ligadas em sequência, o que favorece consultas por intervalo e leitura em disco.',
  },
  {
    title: 'Árvore rubro-negra',
    url: 'https://demo.local/estruturas/rubro-negra',
    keywords: ['rubro-negra', 'balanceamento', 'cores', 'árvore balanceada'],
    content:
      'Árvore binária de busca em que cada nó é vermelho ou preto. Regras sobre as cores limitam a altura e exigem menos rotações que a AVL nas atualizações, à custa de uma busca um pouco mais lenta.',
  },
  {
    title: 'Bubble Sort',
    url: 'https://demo.local/algoritmos/bubble-sort',
    keywords: ['bubble sort', 'ordenação', 'comparação', 'troca'],
    content:
      'Algoritmo simples de ordenação que percorre o vetor várias vezes, trocando elementos adjacentes fora de ordem. Custa O(n²) no pior caso e é usado principalmente para ensino.',
  },
  {
    title: 'Quicksort',
    url: 'https://demo.local/algoritmos/quicksort',
    keywords: ['quicksort', 'ordenação', 'divisão e conquista', 'pivô'],
    content:
      'Escolhe um pivô, separa os elementos menores e maiores e ordena cada parte recursivamente. Tem custo médio O(n log n) e é um dos algoritmos de ordenação mais usados na prática.',
  },
  {
    title: 'Pilhas e filas',
    url: 'https://demo.local/estruturas/pilha-fila',
    keywords: ['pilha', 'fila', 'lifo', 'fifo'],
    content:
      'Estruturas lineares com regras de acesso. Na pilha, o último a entrar é o primeiro a sair (LIFO); na fila, o primeiro a entrar é o primeiro a sair (FIFO).',
  },
  {
    title: 'Lista encadeada',
    url: 'https://demo.local/estruturas/lista-encadeada',
    keywords: ['lista encadeada', 'ponteiros', 'nós'],
    content:
      'Sequência de nós em que cada um aponta para o próximo. Inserir e remover no início custa O(1), mas acessar o i-ésimo elemento exige percorrer a lista.',
  },
  {
    title: 'Tabela hash',
    url: 'https://demo.local/estruturas/hash',
    keywords: ['tabela hash', 'colisão', 'dicionário', 'hash'],
    content:
      'Usa uma função de hash para transformar a chave em uma posição de um vetor. Busca e inserção custam O(1) em média, mas a tabela não mantém as chaves ordenadas nem permite busca por prefixo.',
  },
  {
    title: 'Grafos',
    url: 'https://demo.local/estruturas/grafos',
    keywords: ['grafos', 'vértices', 'arestas', 'busca em largura', 'busca em profundidade'],
    content:
      'Conjunto de vértices ligados por arestas. Buscas em largura e em profundidade percorrem o grafo, e algoritmos como o de Dijkstra encontram caminhos mínimos.',
  },
  {
    title: 'Motores de busca e índice invertido',
    url: 'https://demo.local/busca/indice-invertido',
    keywords: ['buscador', 'índice invertido', 'tf-idf', 'ranking', 'busca'],
    content:
      'Um buscador associa cada palavra às páginas em que ela aparece, o chamado índice invertido. Na consulta, as listas das palavras são combinadas e as páginas são ordenadas por relevância, por exemplo com TF-IDF.',
  },
  {
    title: 'Orientação a objetos',
    url: 'https://demo.local/programacao/poo',
    keywords: ['orientação a objetos', 'classes', 'herança', 'polimorfismo', 'encapsulamento'],
    content:
      'Paradigma que organiza o código em objetos com estado e comportamento. Encapsulamento, herança e polimorfismo ajudam a separar responsabilidades e a reutilizar código.',
  },
  {
    title: 'TypeScript',
    url: 'https://demo.local/programacao/typescript',
    keywords: ['typescript', 'javascript', 'tipos', 'tipagem estática'],
    content:
      'Superconjunto de JavaScript com tipagem estática. O compilador acusa erros de tipo antes da execução e melhora o autocompletar e a refatoração em projetos grandes.',
  },
  {
    title: 'React',
    url: 'https://demo.local/programacao/react',
    keywords: ['react', 'componentes', 'interface', 'estado'],
    content:
      'Biblioteca para construir interfaces a partir de componentes. A tela é descrita como função do estado e o React atualiza apenas o que mudou.',
  },
  {
    title: 'Docker na prática',
    url: 'https://demo.local/infra/docker',
    keywords: ['docker', 'container', 'imagem', 'virtualização'],
    content:
      'Empacota uma aplicação e suas dependências em uma imagem, que roda como container isolado. Diferente de uma máquina virtual, o container compartilha o kernel do sistema hospedeiro.',
  },
  {
    title: 'Internet das Coisas',
    url: 'https://demo.local/iot/introducao',
    keywords: ['iot', 'sensores', 'monitoramento', 'internet das coisas'],
    content:
      'Dispositivos com sensores enviam dados pela rede para serem armazenados e analisados. É usada em monitoramento ambiental, automação residencial e indústria.',
  },
];

/** Cadastra as páginas de exemplo no buscador. */
export function loadSamplePages(engine: SearchEngine): void {
  for (const page of SAMPLE_PAGES) engine.addPage(page);
}
