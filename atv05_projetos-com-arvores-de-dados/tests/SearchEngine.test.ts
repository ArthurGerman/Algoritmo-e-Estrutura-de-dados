import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PageNotFoundError, SearchEngine, ValidationError } from '../src/core';
import type { PageInput } from '../src/core';
import { SAMPLE_PAGES, loadSamplePages } from '../src/core/seed/samplePages';

const page = (overrides: Partial<PageInput> = {}): PageInput => ({
  title: 'Título',
  url: 'https://demo.local/x',
  content: '',
  keywords: [],
  ...overrides,
});

describe('SearchEngine: cadastro', () => {
  let engine: SearchEngine;
  beforeEach(() => {
    engine = new SearchEngine({ now: () => 1000 });
  });

  it('cadastra páginas com ids crescentes e timestamps', () => {
    const a = engine.addPage(page({ title: 'Alfa' }));
    const b = engine.addPage(page({ title: 'Beta' }));
    expect([a.id, b.id]).toEqual([1, 2]);
    expect(a.createdAt).toBe(1000);
    expect(engine.getPage(2)?.title).toBe('Beta');
    expect(engine.listPages().map((p) => p.id)).toEqual([1, 2]);
  });

  it('limpa espaços e remove palavras-chave vazias ou repetidas', () => {
    const created = engine.addPage(page({ title: '  Alfa  ', keywords: [' a1 ', '', 'a1', '  '] }));
    expect(created.title).toBe('Alfa');
    expect(created.keywords).toEqual(['a1']);
  });

  it('rejeita título vazio, URL vazia e página sem termos indexáveis', () => {
    expect(() => engine.addPage(page({ title: '   ' }))).toThrow(ValidationError);
    expect(() => engine.addPage(page({ url: '' }))).toThrow(ValidationError);
    expect(() => engine.addPage(page({ title: '!!!', content: '', keywords: ['?'] }))).toThrow(ValidationError);
    expect(engine.stats().pageCount).toBe(0);
  });

  it('entrada inválida não consome id nem altera o índice', () => {
    expect(() => engine.addPage(page({ title: '' }))).toThrow();
    const ok = engine.addPage(page({ title: 'Alfa' }));
    expect(ok.id).toBe(1);
  });
});

describe('SearchEngine: busca', () => {
  let engine: SearchEngine;
  beforeEach(() => {
    engine = new SearchEngine();
    loadSamplePages(engine);
  });

  it('encontra por palavra-chave ignorando acentos e maiúsculas', () => {
    const response = engine.search('ARVORE BALANCEADA');
    const titles = response.hits.map((hit) => hit.page.title);
    expect(titles).toContain('Árvore AVL');
    expect(titles).toContain('Árvore rubro-negra');
    expect(response.terms).toEqual(['arvore', 'balanceada']);
  });

  it('modo "all" exige todos os termos; "any" aceita qualquer um', () => {
    const all = engine.search('trie docker', { mode: 'all' });
    expect(all.totalHits).toBe(0);

    const any = engine.search('trie docker', { mode: 'any' });
    expect(any.hits.map((hit) => hit.page.title)).toEqual(
      expect.arrayContaining(['Trie: árvore de prefixos', 'Docker na prática']),
    );
  });

  it('consulta vazia, só com stop words ou desconhecida não retorna nada', () => {
    expect(engine.search('').totalHits).toBe(0);
    expect(engine.search('de a o').totalHits).toBe(0);
    expect(engine.search('xyzzy').totalHits).toBe(0);
  });

  it('prefixo na última palavra permite buscar enquanto digita', () => {
    expect(engine.search('autocomp').totalHits).toBe(0);
    const response = engine.search('autocomp', { prefixLastTerm: true });
    expect(response.hits[0]?.page.title).toBe('Trie: árvore de prefixos');
    expect(response.hits[0]?.matchedTerms).toEqual(['autocompletar']);
  });

  it('o prefixo vale só para a última palavra', () => {
    expect(engine.search('arv balanceada', { prefixLastTerm: true }).totalHits).toBe(0);
    expect(engine.search('balanceada arv', { prefixLastTerm: true }).totalHits).toBeGreaterThan(0);
  });

  it('ordena por relevância: palavra-chave pesa mais que menção no corpo', () => {
    const local = new SearchEngine();
    local.addPage(page({ title: 'Menção', content: 'Texto que cita grafos de passagem.' }));
    const forte = local.addPage(page({ title: 'Forte', keywords: ['grafos'], content: 'grafos' }));
    const response = local.search('grafos');
    expect(response.hits[0]?.page.id).toBe(forte.id);
    expect(response.hits[0]?.score).toBeGreaterThan(response.hits[1]?.score ?? Infinity);
  });

  it('desempata por id e respeita limit sem perder totalHits', () => {
    const local = new SearchEngine();
    for (let i = 0; i < 5; i++) local.addPage(page({ title: `Igual ${i}`, keywords: ['comum'] }));
    const response = local.search('comum', { limit: 2 });
    expect(response.totalHits).toBe(5);
    expect(response.hits.map((hit) => hit.page.id)).toEqual([1, 2]);
  });

  it('termos raros pesam mais que termos comuns', () => {
    const local = new SearchEngine();
    local.addPage(page({ title: 'Pagina um', keywords: ['comum', 'raro'] }));
    local.addPage(page({ title: 'P2', keywords: ['comum'] }));
    local.addPage(page({ title: 'P3', keywords: ['comum'] }));
    const rare = local.search('raro').hits[0]?.score ?? 0;
    const common = local.search('comum').hits[0]?.score ?? 0;
    expect(rare).toBeGreaterThan(common);
  });

  it('a busca por todas as páginas de exemplo funciona', () => {
    expect(engine.stats().pageCount).toBe(SAMPLE_PAGES.length);
    expect(engine.search('ordenação').hits.map((hit) => hit.page.title)).toEqual(
      expect.arrayContaining(['Bubble Sort', 'Quicksort']),
    );
  });

  it('sugere termos por prefixo, mais frequentes primeiro', () => {
    const suggestions = engine.suggest('ar');
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.every((s) => s.term.startsWith('ar'))).toBe(true);
    const frequencies = suggestions.map((s) => s.documentFrequency);
    expect([...frequencies].sort((a, b) => b - a)).toEqual(frequencies);
    expect(engine.suggest('')).toEqual([]);
    expect(engine.suggest('ÁRV')[0]?.term).toBe('arvore');
  });
});

describe('SearchEngine: edição e remoção', () => {
  let engine: SearchEngine;
  beforeEach(() => {
    engine = new SearchEngine();
  });

  it('remover uma página a tira dos resultados e limpa a Trie', () => {
    const base = engine.stats();
    const created = engine.addPage(page({ title: 'Unico', keywords: ['zebra'] }));
    expect(engine.search('zebra').totalHits).toBe(1);

    expect(engine.removePage(created.id)).toBe(true);
    expect(engine.search('zebra').totalHits).toBe(0);
    expect(engine.getPage(created.id)).toBeUndefined();
    expect(engine.stats()).toEqual(base); // termos e nós órfãos foram podados
    expect(engine.removePage(created.id)).toBe(false);
  });

  it('remover uma página mantém termos compartilhados por outras', () => {
    const a = engine.addPage(page({ title: 'A', keywords: ['comum', 'soa'] }));
    engine.addPage(page({ title: 'B', keywords: ['comum'] }));
    engine.removePage(a.id);
    expect(engine.search('comum').hits.map((h) => h.page.title)).toEqual(['B']);
    expect(engine.search('soa').totalHits).toBe(0);
  });

  it('editar reindexa: termos antigos somem e os novos aparecem', () => {
    const created = engine.addPage(page({ title: 'Antigo', keywords: ['velho'] }));
    const updated = engine.updatePage(created.id, { title: 'Novo', keywords: ['recente'] });

    expect(updated.id).toBe(created.id);
    expect(updated.createdAt).toBe(created.createdAt);
    expect(engine.search('velho').totalHits).toBe(0);
    expect(engine.search('recente').hits[0]?.page.title).toBe('Novo');
  });

  it('editar com dados inválidos não altera a página nem o índice', () => {
    const created = engine.addPage(page({ title: 'Ok', keywords: ['estavel'] }));
    expect(() => engine.updatePage(created.id, { title: '  ' })).toThrow(ValidationError);
    expect(engine.getPage(created.id)?.title).toBe('Ok');
    expect(engine.search('estavel').totalHits).toBe(1);
  });

  it('editar uma página inexistente lança PageNotFoundError', () => {
    expect(() => engine.updatePage(42, { title: 'x' })).toThrow(PageNotFoundError);
  });

  it('ids não são reaproveitados após remoção', () => {
    const a = engine.addPage(page({ title: 'Alfa' }));
    engine.removePage(a.id);
    expect(engine.addPage(page({ title: 'Beta' })).id).toBe(2);
  });
});

describe('SearchEngine: observação e visualização', () => {
  it('notifica assinantes a cada mutação bem-sucedida e só nelas', () => {
    const engine = new SearchEngine();
    const listener = vi.fn();
    const unsubscribe = engine.subscribe(listener);

    const created = engine.addPage(page({ title: 'Alfa' }));
    engine.updatePage(created.id, { title: 'Beta' });
    engine.removePage(created.id);
    expect(listener).toHaveBeenCalledTimes(3);
    expect(engine.getVersion()).toBe(3);

    expect(() => engine.addPage(page({ title: '' }))).toThrow();
    engine.removePage(999);
    engine.search('qualquer');
    expect(listener).toHaveBeenCalledTimes(3);

    unsubscribe();
    engine.addPage(page({ title: 'Gama' }));
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it('expõe visualizações da Trie e da AVL', () => {
    const engine = new SearchEngine();
    loadSamplePages(engine);
    expect(engine.termTreeView()?.label).toBe('(raiz)');
    expect(engine.termTreeView({ prefix: 'Árv' })?.label).toMatch(/^arv/);
    expect(engine.termTreeView({ prefix: 'zzz' })).toBeNull();
    expect(engine.documentTreeView()?.detail).toMatch(/h=\d+/);

    const stats = engine.stats();
    expect(stats.avlHeight).toBeLessThanOrEqual(Math.ceil(1.44 * Math.log2(stats.pageCount + 2)));
    expect(stats.trieNodeCount).toBeGreaterThan(stats.termCount);
  });
});
