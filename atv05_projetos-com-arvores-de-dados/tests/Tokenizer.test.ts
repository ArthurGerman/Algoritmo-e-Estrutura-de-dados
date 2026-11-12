import { describe, expect, it } from 'vitest';
import { Tokenizer } from '../src/core/text/Tokenizer';

describe('Tokenizer', () => {
  const tokenizer = new Tokenizer();

  it('normaliza maiúsculas e acentos', () => {
    expect(tokenizer.normalize('Árvore AÇÃO Última')).toBe('arvore acao ultima');
  });

  it('separa por pontuação e símbolos', () => {
    expect(tokenizer.tokenize('B+, rubro-negra; AVL!')).toEqual(['rubro', 'negra', 'avl']);
  });

  it('descarta stop words (com e sem acento) e tokens curtos', () => {
    expect(tokenizer.tokenize('A árvore é de busca e são rápidas')).toEqual(['arvore', 'busca', 'rapidas']);
  });

  it('mantém números', () => {
    expect(tokenizer.tokenize('Versão 2026 do React 18')).toEqual(['versao', '2026', 'react', '18']);
  });

  it('mantém repetições em tokenize e remove em uniqueTokens', () => {
    expect(tokenizer.tokenize('avl avl trie')).toEqual(['avl', 'avl', 'trie']);
    expect(tokenizer.uniqueTokens('avl avl trie avl')).toEqual(['avl', 'trie']);
  });

  it('devolve lista vazia para texto vazio ou só de símbolos', () => {
    expect(tokenizer.tokenize('')).toEqual([]);
    expect(tokenizer.tokenize('  ---  !!! ')).toEqual([]);
  });

  it('aceita opções personalizadas', () => {
    const custom = new Tokenizer({ minLength: 1, stopWords: ['Árvore'] });
    expect(custom.tokenize('c árvore avl')).toEqual(['c', 'avl']);
  });
});
