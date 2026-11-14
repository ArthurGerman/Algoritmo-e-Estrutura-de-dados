import { ValidationError } from '../errors';
import type { SearchEngine } from '../SearchEngine';
import type { CrawledPage, CrawlSink, SaveResult } from './Crawler';

/** Liga o crawler ao buscador: páginas novas são indexadas; páginas já conhecidas (mesma URL) são atualizadas. */
export class EngineCrawlSink implements CrawlSink {
  constructor(private readonly engine: SearchEngine) {}

  save(page: CrawledPage): SaveResult {
    try {
      const { created } = this.engine.upsertPage({
        title: page.title,
        url: page.url,
        content: page.content,
        keywords: page.keywords,
      });
      return { kind: created ? 'added' : 'updated' };
    } catch (error) {
      if (error instanceof ValidationError) return { kind: 'rejected', reason: error.message };
      throw error;
    }
  }
}
