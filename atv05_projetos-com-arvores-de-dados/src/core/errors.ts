/** Dados de entrada inválidos (título vazio, página sem termos indexáveis etc.). */
export class ValidationError extends Error {
  constructor(
    message: string,
    readonly field?: string,
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/** Operação sobre uma página que não está no índice. */
export class PageNotFoundError extends Error {
  constructor(readonly pageId: number) {
    super(`Página #${pageId} não encontrada.`);
    this.name = 'PageNotFoundError';
  }
}
