import { describe, expect, it } from 'vitest';
import { AvlTree } from '../src/core/tree/AvlTree';
import { createRandom } from './helpers';

const numeric = (a: number, b: number): number => a - b;
const newTree = (): AvlTree<number, string> => new AvlTree<number, string>(numeric);

describe('AvlTree', () => {
  it('começa vazia', () => {
    const tree = newTree();
    expect(tree.size).toBe(0);
    expect(tree.height).toBe(0);
    expect(tree.get(1)).toBeUndefined();
    expect(tree.min()).toBeUndefined();
    expect(tree.max()).toBeUndefined();
    expect(tree.delete(1)).toBe(false);
    expect(tree.toTreeView((k) => ({ label: String(k) }))).toBeNull();
  });

  it('insere, busca e percorre em ordem crescente', () => {
    const tree = newTree();
    for (const key of [50, 20, 70, 10, 30, 60, 80, 25]) tree.set(key, `v${key}`);
    expect(tree.size).toBe(8);
    expect(tree.get(30)).toBe('v30');
    expect(tree.has(99)).toBe(false);
    expect([...tree.keys()]).toEqual([10, 20, 25, 30, 50, 60, 70, 80]);
    expect(tree.min()).toEqual([10, 'v10']);
    expect(tree.max()).toEqual([80, 'v80']);
    tree.checkInvariants();
  });

  it('substitui o valor de uma chave existente sem aumentar o tamanho', () => {
    const tree = newTree();
    tree.set(1, 'a');
    tree.set(1, 'b');
    expect(tree.size).toBe(1);
    expect(tree.get(1)).toBe('b');
  });

  it.each([
    ['crescente', (i: number) => i],
    ['decrescente', (i: number) => 1000 - i],
  ])('mantém altura logarítmica com inserções em ordem %s', (_name, keyOf) => {
    const tree = newTree();
    for (let i = 1; i <= 1000; i++) tree.set(keyOf(i), '');
    tree.checkInvariants();
    // Limite teórico da AVL: 1,44 * log2(n + 2).
    expect(tree.height).toBeLessThanOrEqual(Math.ceil(1.44 * Math.log2(1002)));
  });

  it('cobre as quatro rotações (LL, RR, LR, RL)', () => {
    for (const keys of [[3, 2, 1], [1, 2, 3], [3, 1, 2], [1, 3, 2]]) {
      const tree = newTree();
      keys.forEach((key) => tree.set(key, ''));
      expect(tree.height).toBe(2);
      expect([...tree.keys()]).toEqual([1, 2, 3]);
      tree.checkInvariants();
    }
  });

  it('remove folha, nó com um filho e nó com dois filhos', () => {
    const tree = newTree();
    for (const key of [50, 30, 70, 20, 40, 60, 80, 35]) tree.set(key, '');

    expect(tree.delete(20)).toBe(true); // folha
    expect(tree.delete(40)).toBe(true); // um filho (35)
    expect(tree.delete(50)).toBe(true); // dois filhos (raiz)
    expect(tree.delete(999)).toBe(false);

    expect([...tree.keys()]).toEqual([30, 35, 60, 70, 80]);
    expect(tree.size).toBe(5);
    tree.checkInvariants();
  });

  it('esvazia por completo e pode ser reutilizada', () => {
    const tree = newTree();
    for (let i = 0; i < 100; i++) tree.set(i, '');
    for (let i = 0; i < 100; i++) expect(tree.delete(i)).toBe(true);
    expect(tree.size).toBe(0);
    expect(tree.height).toBe(0);
    tree.set(7, 'x');
    expect(tree.get(7)).toBe('x');
    tree.checkInvariants();
  });

  it('concorda com um Map de referência em operações aleatórias', () => {
    const random = createRandom(2026);
    const tree = newTree();
    const reference = new Map<number, string>();

    for (let step = 0; step < 6000; step++) {
      const key = Math.floor(random() * 400);
      if (random() < 0.6) {
        tree.set(key, `v${step}`);
        reference.set(key, `v${step}`);
      } else {
        expect(tree.delete(key)).toBe(reference.delete(key));
      }
      if (step % 100 === 0) tree.checkInvariants();
    }

    tree.checkInvariants();
    expect(tree.size).toBe(reference.size);
    expect([...tree.entries()]).toEqual([...reference].sort(([a], [b]) => a - b));
  });

  it('gera visualização com arestas esq/dir e respeita maxDepth', () => {
    const tree = newTree();
    [2, 1, 3, 4].forEach((key) => tree.set(key, ''));
    const view = tree.toTreeView((key) => ({ label: String(key) }), 1);
    expect(view?.label).toBe('2');
    expect(view?.children.map((child) => [child.edge, child.label])).toEqual([
      ['esq', '1'],
      ['dir', '3'],
    ]);
    expect(view?.children[1]?.truncated).toBe(true); // o 4 está além de maxDepth
  });
});
