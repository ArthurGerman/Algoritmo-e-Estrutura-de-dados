import type { Tokenizer } from '../text/Tokenizer';
import type { DocumentRepository } from './DocumentRepository';
import type { InvertedIndex } from './InvertedIndex';
import type { SearchHit, SearchMode, SearchOptions, SearchResponse } from '../types';

interface Candidate {
  score: number;
  matchedTerms: Set<string>;
}

/** Resultado de um termo da consulta: id da página -> contribuição ao ranking. */
type TermMatches = Map<number, Candidate>;

const DEFAULT_LIMIT = 20;

/**
 * Executa consultas sobre o índice e ordena os resultados por relevância.
 *
 * Ranking (TF-IDF com tf suavizado):
 *   contribuição(termo, página) = (1 + ln(peso)) * ln(1 + N / df)
 * - peso: frequência do termo na página, ponderada por campo (palavras-chave > título > corpo);
 * - df: em quantas páginas o termo aparece; N: total de páginas.
 * Termos raros valem mais que termos comuns. A nota da página é a soma das
 * contribuições de cada termo da consulta.
 */
export class Searcher {
  constructor(
    private readonly tokenizer: Tokenizer,
    private readonly index: InvertedIndex,
    private readonly repository: DocumentRepository,
  ) {}

  search(query: string, options: SearchOptions = {}): SearchResponse {
    const started = performance.now();
    const mode = options.mode ?? 'all';
    const prefixLastTerm = options.prefixLastTerm ?? false;
    const limit = Math.max(1, Math.floor(options.limit ?? DEFAULT_LIMIT));

    const terms = this.tokenizer.uniqueTokens(query);
    const combined = terms.length === 0 ? new Map<number, Candidate>() : this.match(terms, mode, prefixLastTerm);

    const hits: SearchHit[] = [];
    for (const [docId, candidate] of combined) {
      const record = this.repository.get(docId);
      if (record === undefined) continue;
      hits.push({
        page: record.page,
        score: candidate.score,
        matchedTerms: [...candidate.matchedTerms].sort(),
      });
    }
    hits.sort((a, b) => b.score - a.score || a.page.id - b.page.id);

    return {
      query,
      terms,
      hits: hits.slice(0, limit),
      totalHits: hits.length,
      elapsedMs: performance.now() - started,
    };
  }

  private match(terms: string[], mode: SearchMode, prefixLastTerm: boolean): Map<number, Candidate> {
    const total = this.repository.size;
    const perTerm = terms.map((term, i) =>
      this.matchTerm(term, prefixLastTerm && i === terms.length - 1, total),
    );
    return mode === 'all' ? intersect(perTerm) : union(perTerm);
  }

  private matchTerm(term: string, asPrefix: boolean, total: number): TermMatches {
    const sources: Array<[string, ReadonlyMap<number, number>]> = [];
    if (asPrefix) {
      sources.push(...this.index.matchPrefix(term));
    } else {
      const postings = this.index.postings(term);
      if (postings !== undefined) sources.push([term, postings]);
    }

    const matches: TermMatches = new Map();
    for (const [matchedTerm, postings] of sources) {
      const idf = Math.log(1 + total / postings.size);
      for (const [docId, weight] of postings) {
        const contribution = (1 + Math.log(weight)) * idf;
        const existing = matches.get(docId);
        if (existing === undefined) {
          matches.set(docId, { score: contribution, matchedTerms: new Set([matchedTerm]) });
        } else {
          // Um termo da consulta expandido em vários termos do índice não deve
          // pontuar mais por isso: vale a melhor contribuição.
          existing.score = Math.max(existing.score, contribution);
          existing.matchedTerms.add(matchedTerm);
        }
      }
    }
    return matches;
  }
}

/** Páginas presentes em TODOS os conjuntos. Itera o menor conjunto e consulta os demais. */
function intersect(sets: TermMatches[]): Map<number, Candidate> {
  const ordered = [...sets].sort((a, b) => a.size - b.size);
  const smallest = ordered[0];
  const result = new Map<number, Candidate>();
  if (smallest === undefined) return result;

  for (const [docId, candidate] of smallest) {
    let score = candidate.score;
    const matchedTerms = new Set(candidate.matchedTerms);
    let inAll = true;
    for (let i = 1; i < ordered.length; i++) {
      const other = ordered[i]?.get(docId);
      if (other === undefined) {
        inAll = false;
        break;
      }
      score += other.score;
      other.matchedTerms.forEach((term) => matchedTerms.add(term));
    }
    if (inAll) result.set(docId, { score, matchedTerms });
  }
  return result;
}

/** Páginas presentes em QUALQUER conjunto; as notas se somam. */
function union(sets: TermMatches[]): Map<number, Candidate> {
  const result = new Map<number, Candidate>();
  for (const set of sets) {
    for (const [docId, candidate] of set) {
      const existing = result.get(docId);
      if (existing === undefined) {
        result.set(docId, { score: candidate.score, matchedTerms: new Set(candidate.matchedTerms) });
      } else {
        existing.score += candidate.score;
        candidate.matchedTerms.forEach((term) => existing.matchedTerms.add(term));
      }
    }
  }
  return result;
}
