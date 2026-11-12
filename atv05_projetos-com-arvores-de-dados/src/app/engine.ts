import { SearchEngine } from '../core';
import { loadSamplePages } from '../core/seed/samplePages';

/** Instância única do buscador usada pela interface, já com páginas de exemplo. */
export const engine = new SearchEngine();
loadSamplePages(engine);
