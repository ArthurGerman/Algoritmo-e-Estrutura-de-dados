export interface TokenizerOptions {
  /** Tamanho mínimo de um token (padrão: 2). */
  minLength?: number;
  /** Palavras ignoradas (padrão: lista básica de português e inglês). */
  stopWords?: Iterable<string>;
}

const DEFAULT_STOP_WORDS: readonly string[] = [
  // português
  'a', 'o', 'as', 'os', 'um', 'uma', 'uns', 'umas', 'de', 'do', 'da', 'dos', 'das',
  'em', 'no', 'na', 'nos', 'nas', 'por', 'para', 'com', 'sem', 'e', 'ou', 'que',
  'se', 'ao', 'aos', 'como', 'mais', 'mas', 'ser', 'foi', 'sao',
  // inglês
  'the', 'of', 'and', 'to', 'in', 'is', 'for', 'on', 'with',
];

const SEPARATOR = /[^\p{L}\p{N}]+/u;

/**
 * Transforma texto em termos de indexação. O MESMO tokenizador deve ser usado
 * ao indexar e ao consultar, senão "Árvore" e "arvore" nunca se encontrariam.
 *
 * Pipeline: minúsculas -> remove acentos -> separa em não-letras/não-dígitos
 * -> descarta tokens curtos e stop words.
 */
export class Tokenizer {
  private readonly minLength: number;
  private readonly stopWords: ReadonlySet<string>;

  constructor(options: TokenizerOptions = {}) {
    this.minLength = options.minLength ?? 2;
    this.stopWords = new Set(
      [...(options.stopWords ?? DEFAULT_STOP_WORDS)].map((word) => this.normalize(word)),
    );
  }

  /** Minúsculas e sem acentos ("Ação" -> "acao"). */
  normalize(text: string): string {
    return text.normalize('NFD').replace(/\p{M}+/gu, '').toLowerCase();
  }

  /** Tokens na ordem em que aparecem, com repetições (úteis para contar frequência). */
  tokenize(text: string): string[] {
    return this.normalize(text)
      .split(SEPARATOR)
      .filter((token) => token.length >= this.minLength && !this.stopWords.has(token));
  }

  /** Tokens sem repetição, preservando a ordem da primeira ocorrência. */
  uniqueTokens(text: string): string[] {
    return [...new Set(this.tokenize(text))];
  }
}
