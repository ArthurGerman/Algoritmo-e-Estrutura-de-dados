import type { Page, SearchEngine } from '../core';
import { useEngineVersion } from './useEngineVersion';

interface Props {
  engine: SearchEngine;
  onEdit: (id: number) => void;
}

export function PageList({ engine, onEdit }: Props) {
  useEngineVersion(engine);
  const pages: Page[] = engine.listPages();

  return (
    <section aria-labelledby="pages-title">
      <h2 id="pages-title">Páginas indexadas ({pages.length})</h2>
      {pages.length === 0 && <p className="muted">Nenhuma página cadastrada.</p>}
      <ul className="pages">
        {pages.map((page) => (
          <li key={page.id}>
            <span>
              #{page.id} {page.title}
            </span>
            <span className="row">
              <button type="button" onClick={() => onEdit(page.id)}>
                Editar
              </button>
              <button type="button" onClick={() => engine.removePage(page.id)}>
                Remover
              </button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
