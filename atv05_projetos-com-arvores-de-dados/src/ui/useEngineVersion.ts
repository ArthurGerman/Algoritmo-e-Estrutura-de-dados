import { useSyncExternalStore } from 'react';
import type { SearchEngine } from '../core';

/** Re-renderiza o componente sempre que o buscador sofre uma mutação. */
export function useEngineVersion(engine: SearchEngine): number {
  return useSyncExternalStore(engine.subscribe, engine.getVersion);
}
