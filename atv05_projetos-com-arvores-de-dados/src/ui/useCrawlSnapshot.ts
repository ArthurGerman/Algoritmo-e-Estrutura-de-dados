import { useCallback, useSyncExternalStore } from 'react';
import { INITIAL_CRAWL_SNAPSHOT, type Crawler, type CrawlSnapshot } from '../core';

const noop = (): void => {};

/** Estado do crawler para a interface; devolve o estado "parado" enquanto não há crawler. */
export function useCrawlSnapshot(crawler: Crawler | null): CrawlSnapshot {
  const subscribe = useCallback(
    (listener: () => void) => (crawler === null ? noop : crawler.subscribe(listener)),
    [crawler],
  );
  const getSnapshot = useCallback(() => (crawler === null ? INITIAL_CRAWL_SNAPSHOT : crawler.getSnapshot()), [crawler]);
  return useSyncExternalStore(subscribe, getSnapshot);
}
