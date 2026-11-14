/** Regras do robots.txt aplicáveis ao nosso crawler. */

interface Rule {
  allow: boolean;
  pattern: string;
}

interface Group {
  agents: string[];
  rules: Rule[];
  crawlDelayMs: number;
}

const MAX_CRAWL_DELAY_MS = 10_000;
const MAX_PATTERN_LENGTH = 200;

/**
 * Casamento de padrão do robots.txt: '*' vale por qualquer sequência e '$' no fim
 * ancora o final do caminho. Feito sem regex, em tempo polinomial, porque o padrão
 * vem de um site que não controlamos.
 */
export function matchesPattern(pattern: string, path: string): boolean {
  const anchored = pattern.endsWith('$');
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const parts = body.split('*');
  const first = parts[0] ?? '';
  if (!path.startsWith(first)) return false;
  if (parts.length === 1) return anchored ? path === first : true;

  let position = first.length;
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i] ?? '';
    if (i === parts.length - 1 && anchored) {
      return path.length - part.length >= position && path.endsWith(part);
    }
    const found = path.indexOf(part, position);
    if (found === -1) return false;
    position = found + part.length;
  }
  return true;
}

export class RobotsRules {
  private constructor(
    private readonly rules: readonly Rule[],
    /** Intervalo mínimo pedido pelo site entre requisições (0 se não pediu). */
    readonly crawlDelayMs: number,
  ) {}

  static allowAll(): RobotsRules {
    return new RobotsRules([], 0);
  }

  /** Lê um robots.txt e escolhe o grupo de `agent` (ou, na falta dele, o grupo '*'). */
  static parse(text: string, agent: string): RobotsRules {
    const groups: Group[] = [];
    let current: Group | null = null;
    let lastWasAgent = false;

    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.replace(/#.*$/, '').trim();
      const colon = line.indexOf(':');
      if (colon === -1) continue;
      const field = line.slice(0, colon).trim().toLowerCase();
      const value = line.slice(colon + 1).trim();

      if (field === 'user-agent') {
        if (current === null || !lastWasAgent) {
          current = { agents: [], rules: [], crawlDelayMs: 0 };
          groups.push(current);
        }
        current.agents.push(value.toLowerCase());
        lastWasAgent = true;
        continue;
      }
      lastWasAgent = false;
      if (current === null) continue;

      if ((field === 'allow' || field === 'disallow') && value !== '' && value.length <= MAX_PATTERN_LENGTH) {
        current.rules.push({ allow: field === 'allow', pattern: value });
      } else if (field === 'crawl-delay') {
        const seconds = Number(value);
        if (Number.isFinite(seconds) && seconds > 0) {
          current.crawlDelayMs = Math.min(MAX_CRAWL_DELAY_MS, seconds * 1000);
        }
      }
    }

    const ours = agent.toLowerCase();
    const specific = groups.filter((g) => g.agents.some((a) => a !== '*' && a !== '' && ours.includes(a)));
    const chosen = specific.length > 0 ? specific : groups.filter((g) => g.agents.includes('*'));
    return new RobotsRules(
      chosen.flatMap((g) => g.rules),
      Math.max(0, ...chosen.map((g) => g.crawlDelayMs)),
    );
  }

  /** `pathWithQuery`: caminho + query da URL (ex.: "/a/b?x=1"). A regra mais específica vence; empate favorece Allow. */
  isAllowed(pathWithQuery: string): boolean {
    if (pathWithQuery === '/robots.txt') return true;
    let best: Rule | null = null;
    for (const rule of this.rules) {
      if (!matchesPattern(rule.pattern, pathWithQuery)) continue;
      if (
        best === null ||
        rule.pattern.length > best.pattern.length ||
        (rule.pattern.length === best.pattern.length && rule.allow)
      ) {
        best = rule;
      }
    }
    return best === null || best.allow;
  }
}
