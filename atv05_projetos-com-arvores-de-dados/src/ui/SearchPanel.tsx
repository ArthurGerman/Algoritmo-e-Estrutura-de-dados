import { useMemo, useState } from 'react';
import type { SearchEngine, SearchMode } from '../core';
import { useEngineVersion } from './useEngineVersion';

interface Props {
  engine: SearchEngine;
}

function snippet(text: string, max = 160): string {
  return text.length <= max ? text : `${text.slice(0, max).trimEnd()}…`;
}

export function SearchPanel({ engine }: Props) {
  const version = useEngineVersion(engine);
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<SearchMode>('all');
  const [prefix, setPrefix] = useState(true);

  const response = useMemo(
    () => engine.search(query, { mode, prefixLastTerm: prefix }),
    // `version` muda a cada edição do índice e invalida o resultado em cache.
    [engine, query, mode, prefix, version],
  );

  const lastWord = query.split(/\s+/).pop() ?? '';
  const suggestions = useMemo(
    () => (prefix ? engine.suggest(lastWord, 6) : []),
    [engine, lastWord, prefix, version],
  );

  const applySuggestion = (term: string): void => {
    const words = query.split(/\s+/);
    words[words.length - 1] = term;
    setQuery(`${words.join(' ')} `);
  };

  return (
    <section aria-labelledby="search-title">
      <h2 id="search-title">Buscar</h2>
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Digite uma ou mais palavras"
        aria-label="Consulta"
      />
      <div className="row">
        <label>
          <input type="radio" checked={mode === 'all'} onChange={() => setMode('all')} /> Todas as palavras
        </label>
        <label>
          <input type="radio" checked={mode === 'any'} onChange={() => setMode('any')} /> Qualquer palavra
        </label>
        <label>
          <input type="checkbox" checked={prefix} onChange={(event) => setPrefix(event.target.checked)} /> Prefixo na
          última palavra
        </label>
      </div>

      {suggestions.length > 0 && (
        <div className="row">
          {suggestions.map((s) => (
            <button key={s.term} type="button" className="chip" onClick={() => applySuggestion(s.term)}>
              {s.term} ({s.documentFrequency})
            </button>
          ))}
        </div>
      )}

      {query.trim() !== '' && (
        <p className="muted">
          {response.totalHits} resultado(s)
          {response.hits.length < response.totalHits ? `, mostrando os ${response.hits.length} mais relevantes` : ''} em{' '}
          {response.elapsedMs.toFixed(2)} ms
        </p>
      )}
      <ol className="results">
        {response.hits.map((hit) => (
          <li key={hit.page.id}>
            <strong>{hit.page.title}</strong>
            <div className="muted">{hit.page.url}</div>
            <div>{snippet(hit.page.content)}</div>
            <div className="muted">
              relevância {hit.score.toFixed(2)} · termos: {hit.matchedTerms.join(', ')}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
