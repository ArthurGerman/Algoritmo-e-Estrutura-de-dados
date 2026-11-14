/** Nome do crawler, usado para escolher o grupo certo no robots.txt. */
export const ROBOTS_AGENT = 'buscadorwebaed';

export interface FetchResult {
  /** URL final, depois de redirecionamentos. */
  url: string;
  status: number;
  contentType: string;
  /** Corpo em texto; vazio quando o conteúdo não é texto. */
  body: string;
}

/**
 * Como o crawler baixa uma URL. É uma interface porque a rede depende do
 * ambiente: no navegador passa por um proxy local (CORS); nos testes é um site falso.
 * Deve rejeitar quando `signal` for abortado ou a rede falhar.
 */
export interface Fetcher {
  fetch(url: string, signal: AbortSignal): Promise<FetchResult>;
}
