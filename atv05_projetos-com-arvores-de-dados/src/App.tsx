import { useState } from 'react';
import { engine } from './app/engine';
import { PageForm } from './ui/PageForm';
import { PageList } from './ui/PageList';
import { SearchPanel } from './ui/SearchPanel';
import { TreeInspector } from './ui/TreeInspector';
import { useEngineVersion } from './ui/useEngineVersion';

export default function App() {
  useEngineVersion(engine);
  const [editingId, setEditingId] = useState<number | null>(null);
  const editing = editingId === null ? undefined : engine.getPage(editingId);

  return (
    <main>
      <h1>Buscador Web</h1>
      <SearchPanel engine={engine} />
      <PageForm
        key={editing?.id ?? 'new'}
        engine={engine}
        editing={editing}
        onDone={() => setEditingId(null)}
      />
      <PageList engine={engine} onEdit={setEditingId} />
      <TreeInspector engine={engine} />
    </main>
  );
}
