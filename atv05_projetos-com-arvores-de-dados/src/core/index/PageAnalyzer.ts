import type { PageInput } from '../types';
import type { Tokenizer } from '../text/Tokenizer';

/** Quanto cada campo "vale" ao contar a frequência de um termo. */
export interface FieldWeights {
  keywords: number;
  title: number;
  content: number;
}

/** Palavras-chave informadas pelo autor são o sinal mais forte; o corpo, o mais fraco. */
export const DEFAULT_FIELD_WEIGHTS: FieldWeights = {
  keywords: 3,
  title: 2,
  content: 1,
};

/**
 * Converte uma página em um mapa termo -> peso, onde o peso é a frequência do
 * termo ponderada pelo campo em que ele aparece.
 */
export class PageAnalyzer {
  constructor(
    private readonly tokenizer: Tokenizer,
    private readonly weights: FieldWeights = DEFAULT_FIELD_WEIGHTS,
  ) {}

  analyze(input: PageInput): Map<string, number> {
    const termWeights = new Map<string, number>();
    const accumulate = (text: string, weight: number): void => {
      for (const token of this.tokenizer.tokenize(text)) {
        termWeights.set(token, (termWeights.get(token) ?? 0) + weight);
      }
    };

    accumulate(input.title, this.weights.title);
    for (const keyword of input.keywords) accumulate(keyword, this.weights.keywords);
    accumulate(input.content, this.weights.content);
    return termWeights;
  }
}
