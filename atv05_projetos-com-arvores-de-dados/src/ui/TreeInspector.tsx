import { useState } from 'react';
import type { SearchEngine, TreeViewNode } from '../core';
import { useEngineVersion } from './useEngineVersion';

type Which = 'trie' | 'avl';

function NodeView({ node }: { node: TreeViewNode }) {
  return (
    <li>
      <span className={node.terminal ? 'node terminal' : 'node'}>
        {node.edge !== undefined && <span className="muted">{node.edge}: </span>}
        {node.label}
        {node.detail !== undefined && <span className="muted"> ({node.detail})</span>}
        {node.truncated === true && <span className="muted"> …</span>}
        {node.hidden !== undefined && <span className="muted"> +{node.hidden}</span>}
      </span>
      {node.children.length > 0 && (
        <ul>
          {node.children.map((child, index) => (
            <NodeView key={`${child.label}-${index}`} node={child} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function TreeInspector({ engine }: { engine: SearchEngine }) {
  useEngineVersion(engine);
  const [which, setWhich] = useState<Which>('trie');
  const [prefix, setPrefix] = useState('');
  const stats = engine.stats();

  const view =
    which === 'trie' ? engine.termTreeView({ prefix, maxDepth: 4, maxChildren: 10 }) : engine.documentTreeView(4);

  return (
    <section aria-labelledby="tree-title">
      <h2 id="tree-title">Estruturas internas</h2>
      <p className="muted">
        {stats.pageCount} páginas · {stats.termCount} termos · Trie: {stats.trieNodeCount} nós, altura{' '}
        {stats.trieHeight} · AVL: altura {stats.avlHeight}
      </p>
      <div className="row">
        <label>
          <input type="radio" checked={which === 'trie'} onChange={() => setWhich('trie')} /> Trie de termos
        </label>
        <label>
          <input type="radio" checked={which === 'avl'} onChange={() => setWhich('avl')} /> AVL de páginas
        </label>
      </div>
      {which === 'trie' && (
        <input
          value={prefix}
          onChange={(event) => setPrefix(event.target.value)}
          placeholder="Filtrar por prefixo (ex.: arv)"
          aria-label="Prefixo"
        />
      )}
      {view === null ? (
        <p className="muted">Nada para exibir.</p>
      ) : (
        <ul className="tree">
          <NodeView node={view} />
        </ul>
      )}
    </section>
  );
}
