import { describe, expect, it } from 'vitest';
import { decodeEntities, MAX_TEXT_CHARS, parseHtml } from '../src/core/crawler/HtmlParser';

const URL_BASE = 'https://s.com/dir/pagina.html';

describe('decodeEntities', () => {
  it('decodifica nomeadas e numéricas, e preserva as desconhecidas', () => {
    expect(decodeEntities('a&ccedil;&atilde;o &amp; &#233; &#xE9; &naoexiste; &#1114112;')).toBe('ação & é é &naoexiste;  ');
  });
});

describe('parseHtml', () => {
  it('extrai título, texto, descrição e palavras-chave', () => {
    const html = `<!doctype html><html><head>
      <title> Árvore &amp; Trie </title>
      <meta name="keywords" content="avl, trie ,, rotação">
      <meta name="description" content="Resumo da página">
      <style>body { color: red }</style><script>var x = "<a href='/script'>nao</a>";</script>
      </head><body><h1>Título principal</h1><p>Texto <b>em</b> negrito.</p></body></html>`;
    const parsed = parseHtml(html, URL_BASE);
    expect(parsed.title).toBe('Árvore & Trie');
    expect(parsed.keywords).toEqual(['avl', 'trie', 'rotação', 'Título principal']);
    expect(parsed.text).toContain('Resumo da página');
    expect(parsed.text).toContain('Texto em negrito.');
    expect(parsed.text).not.toContain('color');
    expect(parsed.text).not.toContain('var x');
    expect(parsed.text).not.toContain('Árvore & Trie'); // o título não se repete no corpo
    expect(parsed.links).toEqual([]); // o link dentro do script não conta
  });

  it('não cola palavras separadas por tags', () => {
    expect(parseHtml('<p>um</p><p>dois</p>a<br>b', URL_BASE).text).toBe('um dois a b');
  });

  it('usa o h1 como título quando não há <title>, e a URL em último caso', () => {
    expect(parseHtml('<h1>Só h1</h1>', URL_BASE).title).toBe('Só h1');
    expect(parseHtml('<p>nada</p>', URL_BASE).title).toBe(URL_BASE);
  });

  it('resolve links relativos, ignora fragmentos puros, mailto e javascript, e remove repetidos', () => {
    const html = `<a href="outra.html">1</a><a href="../raiz.html">2</a><a href="/abs.html#x">3</a>
      <a href="outra.html">repetido</a><a href="mailto:a@b.com">m</a><a href="javascript:void(0)">j</a>
      <a href="https://externo.com/p">e</a><a>sem href</a><a href="#topo">topo</a>`;
    expect(parseHtml(html, URL_BASE).links).toEqual([
      'https://s.com/dir/outra.html',
      'https://s.com/raiz.html',
      'https://s.com/abs.html',
      'https://externo.com/p',
      'https://s.com/dir/pagina.html', // "#topo" resolve para a própria página; o crawler a descarta por já ter sido vista
    ]);
  });

  it('ignora links rel="nofollow" e respeita <base href>', () => {
    const html = `<base href="https://cdn.com/base/"><a href="a.html">a</a><a rel="noopener NoFollow" href="b.html">b</a>`;
    expect(parseHtml(html, URL_BASE).links).toEqual(['https://cdn.com/base/a.html']);
  });

  it('lê atributos sem aspas, com aspas simples e com ">" dentro do valor', () => {
    const html = `<a href=sem-aspas.html>1</a><a href='simples.html'>2</a><a title="a>b" href="com-maior.html">3</a>`;
    expect(parseHtml(html, URL_BASE).links).toEqual([
      'https://s.com/dir/sem-aspas.html',
      'https://s.com/dir/simples.html',
      'https://s.com/dir/com-maior.html',
    ]);
  });

  it('interpreta as diretivas da meta robots', () => {
    const flags = (content: string) => {
      const { noindex, nofollow } = parseHtml(`<meta name="ROBOTS" content="${content}">`, URL_BASE);
      return { noindex, nofollow };
    };
    expect(flags('noindex')).toEqual({ noindex: true, nofollow: false });
    expect(flags('NoFollow, index')).toEqual({ noindex: false, nofollow: true });
    expect(flags('none')).toEqual({ noindex: true, nofollow: true });
    expect(flags('index, follow')).toEqual({ noindex: false, nofollow: false });
  });

  it('ignora comentários e não quebra com HTML malformado', () => {
    const html = '<!-- <a href="/comentado">x</a> --><p>visível<div <b>meio</b> <a href="/ok.html">ok</a> <a href="/quebrada';
    const parsed = parseHtml(html, URL_BASE);
    expect(parsed.links).toContain('https://s.com/ok.html');
    expect(parsed.links).not.toContain('https://s.com/comentado');
    expect(parsed.text).toContain('visível');
  });

  it('trata "<" solto como texto e suporta input vazio', () => {
    expect(parseHtml('2 < 3 e 5 > 4', URL_BASE).text).toBe('2 < 3 e 5 > 4');
    expect(parseHtml('', URL_BASE)).toMatchObject({ title: URL_BASE, text: '', links: [], keywords: [] });
  });

  it('limita o tamanho do texto e processa entrada hostil em tempo linear', () => {
    const big = `<p>${'palavra '.repeat(100_000)}</p>`;
    expect(parseHtml(big, URL_BASE).text.length).toBeLessThanOrEqual(MAX_TEXT_CHARS);

    const hostile = '<a '.repeat(200_000) + '"';
    const started = performance.now();
    parseHtml(hostile, URL_BASE);
    expect(performance.now() - started).toBeLessThan(2000);
  });
});
