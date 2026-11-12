import { describe, expect, it } from 'vitest';
import { Trie } from '../src/core/tree/Trie';

describe('Trie', () => {
  it('começa vazia, só com a raiz', () => {
    const trie = new Trie<number>();
    expect(trie.size).toBe(0);
    expect(trie.nodeCount).toBe(1);
    expect(trie.height()).toBe(0);
    expect(trie.get('a')).toBeUndefined();
    expect(trie.findByPrefix('')).toEqual([]);
    expect(trie.toTreeView()?.children).toEqual([]);
  });

  it('insere, busca e distingue prefixo de chave', () => {
    const trie = new Trie<number>();
    trie.set('casa', 1);
    trie.set('casaco', 2);
    expect(trie.get('casa')).toBe(1);
    expect(trie.get('casaco')).toBe(2);
    expect(trie.has('cas')).toBe(false); // prefixo, mas não é chave
    expect(trie.has('casas')).toBe(false);
    expect(trie.size).toBe(2);
  });

  it('compartilha o caminho de prefixos comuns', () => {
    const trie = new Trie<number>();
    trie.set('casa', 1);
    trie.set('casaco', 2);
    // raiz + c,a,s,a + c,o
    expect(trie.nodeCount).toBe(7);
    expect(trie.height()).toBe(6);
  });

  it('upsert cria e atualiza, e não altera a árvore se o callback falhar', () => {
    const trie = new Trie<number>();
    expect(trie.upsert('x', (current) => (current ?? 0) + 1)).toBe(1);
    expect(trie.upsert('x', (current) => (current ?? 0) + 1)).toBe(2);
    expect(trie.size).toBe(1);

    expect(() =>
      trie.upsert('novo', () => {
        throw new Error('falha');
      }),
    ).toThrow('falha');
    expect(trie.has('novo')).toBe(false);
    expect(trie.nodeCount).toBe(2);
  });

  it('rejeita chave vazia na escrita e a ignora na leitura', () => {
    const trie = new Trie<number>();
    expect(() => trie.set('', 1)).toThrow(RangeError);
    expect(trie.get('')).toBeUndefined();
    expect(trie.has('')).toBe(false);
    expect(trie.delete('')).toBe(false);
  });

  it('lista por prefixo em ordem alfabética, com limite', () => {
    const trie = new Trie<number>();
    ['arvore', 'avl', 'aviao', 'bst', 'ave'].forEach((key, i) => trie.set(key, i));
    expect(trie.findByPrefix('av').map(([key]) => key)).toEqual(['ave', 'aviao', 'avl']);
    expect(trie.findByPrefix('a', 2).map(([key]) => key)).toEqual(['arvore', 'ave']);
    expect(trie.findByPrefix('z')).toEqual([]);
    expect([...trie].map(([key]) => key)).toEqual(['arvore', 'ave', 'aviao', 'avl', 'bst']);
  });

  it('remove e poda nós órfãos até a raiz', () => {
    const trie = new Trie<number>();
    trie.set('casa', 1);
    expect(trie.delete('casa')).toBe(true);
    expect(trie.size).toBe(0);
    expect(trie.nodeCount).toBe(1);
    expect(trie.delete('casa')).toBe(false);
  });

  it('remover uma chave que é prefixo de outra preserva a outra', () => {
    const trie = new Trie<number>();
    trie.set('casa', 1);
    trie.set('casaco', 2);
    expect(trie.delete('casa')).toBe(true);
    expect(trie.has('casa')).toBe(false);
    expect(trie.get('casaco')).toBe(2);
    expect(trie.nodeCount).toBe(7); // nada podado: "casa" ainda é caminho de "casaco"

    expect(trie.delete('casaco')).toBe(true);
    expect(trie.nodeCount).toBe(1);
  });

  it('remover a chave mais longa poda só até o prefixo que ainda é chave', () => {
    const trie = new Trie<number>();
    trie.set('casa', 1);
    trie.set('casaco', 2);
    trie.delete('casaco');
    expect(trie.has('casa')).toBe(true);
    expect(trie.nodeCount).toBe(5); // raiz + c,a,s,a
  });

  it('trata caracteres fora do BMP como um símbolo só', () => {
    const trie = new Trie<number>();
    trie.set('a😀', 1);
    expect(trie.nodeCount).toBe(3);
    expect(trie.get('a😀')).toBe(1);
  });

  it('visualização funde cadeias sem ramificação e marca chaves', () => {
    const trie = new Trie<number>();
    trie.set('avl', 1);
    trie.set('avore', 2);
    trie.set('b', 3);

    const view = trie.toTreeView({ describe: (value) => `v${value}` });
    expect(view?.label).toBe('(raiz)');
    const [a, b] = view?.children ?? [];
    expect(a?.label).toBe('av'); // a -> v fundidos
    expect(a?.children.map((child) => child.label)).toEqual(['l', 'ore']);
    expect(a?.children[0]).toMatchObject({ terminal: true, detail: 'v1' });
    expect(b).toMatchObject({ label: 'b', terminal: true });
  });

  it('visualização por prefixo, maxDepth e maxChildren', () => {
    const trie = new Trie<number>();
    ['ab', 'ac', 'ad', 'ae'].forEach((key) => trie.set(key, 0));

    expect(trie.toTreeView({ prefix: 'z' })).toBeNull();
    expect(trie.toTreeView({ prefix: 'a' })?.label).toBe('a');

    const limited = trie.toTreeView({ maxChildren: 2 });
    expect(limited?.children[0]?.children).toHaveLength(2);
    expect(limited?.children[0]?.hidden).toBe(2);

    const shallow = trie.toTreeView({ maxDepth: 0 });
    expect(shallow?.truncated).toBe(true);
    expect(shallow?.children).toEqual([]);
  });
});
