import { describe, expect, it } from 'vitest';
import { matchesPattern, RobotsRules } from '../src/core/crawler/RobotsRules';

const AGENT = 'buscadorwebaed';

describe('matchesPattern', () => {
  it.each([
    ['/privado/', '/privado/a.html', true],
    ['/privado/', '/publico/a.html', false],
    ['/*.pdf$', '/docs/a.pdf', true],
    ['/*.pdf$', '/docs/a.pdf?x=1', false],
    ['/a*b*c', '/aXXbYYc/zzz', true],
    ['/a*b*c', '/aXXcYYb', false],
    ['/exato$', '/exato', true],
    ['/exato$', '/exato/mais', false],
    ['/*', '/qualquer', true],
    ['/a*$', '/abc', true],
  ])('%s vs %s -> %s', (pattern, path, expected) => {
    expect(matchesPattern(pattern, path)).toBe(expected);
  });

  it('não explode com muitos curingas', () => {
    const started = performance.now();
    matchesPattern('/*a*a*a*a*a*a*a*a*a*a*b', `/${'a'.repeat(2000)}`);
    expect(performance.now() - started).toBeLessThan(500);
  });
});

describe('RobotsRules', () => {
  it('sem regras, tudo é permitido', () => {
    expect(RobotsRules.allowAll().isAllowed('/qualquer')).toBe(true);
    expect(RobotsRules.parse('', AGENT).isAllowed('/qualquer')).toBe(true);
  });

  it('aplica Disallow do grupo *, ignorando comentários e Disallow vazio', () => {
    const rules = RobotsRules.parse(
      '# comentário\nUser-agent: *\nDisallow: /privado/ # aqui\nDisallow:\n',
      AGENT,
    );
    expect(rules.isAllowed('/privado/x')).toBe(false);
    expect(rules.isAllowed('/publico')).toBe(true);
  });

  it('a regra mais longa vence e, em empate, Allow vence', () => {
    const rules = RobotsRules.parse(
      'User-agent: *\nDisallow: /docs/\nAllow: /docs/livre/\nDisallow: /x\nAllow: /x\n',
      AGENT,
    );
    expect(rules.isAllowed('/docs/a')).toBe(false);
    expect(rules.isAllowed('/docs/livre/a')).toBe(true);
    expect(rules.isAllowed('/x')).toBe(true);
  });

  it('prefere o grupo específico do nosso agente ao grupo *', () => {
    const text = 'User-agent: *\nDisallow: /\n\nUser-agent: BuscadorWebAED\nDisallow: /so-isto/\n';
    const rules = RobotsRules.parse(text, 'BuscadorWebAED/0.1');
    expect(rules.isAllowed('/pagina')).toBe(true);
    expect(rules.isAllowed('/so-isto/a')).toBe(false);
  });

  it('agrupa vários User-agent seguidos e ignora regras de outros agentes', () => {
    const text = 'User-agent: googlebot\nUser-agent: outrobot\nDisallow: /a/\n\nUser-agent: *\nDisallow: /b/\n';
    const rules = RobotsRules.parse(text, AGENT);
    expect(rules.isAllowed('/a/x')).toBe(true);
    expect(rules.isAllowed('/b/x')).toBe(false);
  });

  it('lê Crawl-delay em segundos, com teto', () => {
    expect(RobotsRules.parse('User-agent: *\nCrawl-delay: 2\n', AGENT).crawlDelayMs).toBe(2000);
    expect(RobotsRules.parse('User-agent: *\nCrawl-delay: 999\n', AGENT).crawlDelayMs).toBe(10_000);
    expect(RobotsRules.parse('User-agent: *\nCrawl-delay: abc\n', AGENT).crawlDelayMs).toBe(0);
  });

  it('o próprio /robots.txt é sempre permitido', () => {
    expect(RobotsRules.parse('User-agent: *\nDisallow: /\n', AGENT).isAllowed('/robots.txt')).toBe(true);
  });
});
