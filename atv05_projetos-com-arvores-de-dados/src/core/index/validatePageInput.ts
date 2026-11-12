import { ValidationError } from '../errors';
import type { PageInput } from '../types';

/** Limpa e valida os dados de uma página. Lança `ValidationError` se inválidos. */
export function validatePageInput(input: PageInput): PageInput {
  const title = input.title.trim();
  const url = input.url.trim();
  if (title === '') throw new ValidationError('Informe o título da página.', 'title');
  if (url === '') throw new ValidationError('Informe a URL da página.', 'url');

  const keywords = [...new Set(input.keywords.map((keyword) => keyword.trim()))].filter(
    (keyword) => keyword !== '',
  );
  return { title, url, content: input.content.trim(), keywords };
}
