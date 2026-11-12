import { useState, type FormEvent } from 'react';
import { ValidationError, type Page, type PageInput, type SearchEngine } from '../core';

interface Props {
  engine: SearchEngine;
  /** Página em edição; sem ela, o formulário cadastra uma nova. */
  editing?: Page | undefined;
  onDone: () => void;
}

const EMPTY = { title: '', url: '', keywords: '', content: '' };

function toFields(page: Page | undefined): typeof EMPTY {
  return page === undefined
    ? EMPTY
    : { title: page.title, url: page.url, keywords: page.keywords.join(', '), content: page.content };
}

export function PageForm({ engine, editing, onDone }: Props) {
  const [fields, setFields] = useState(() => toFields(editing));
  const [error, setError] = useState<string | null>(null);

  const update = (name: keyof typeof EMPTY, value: string): void => {
    setFields((current) => ({ ...current, [name]: value }));
  };

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    const input: PageInput = {
      title: fields.title,
      url: fields.url,
      content: fields.content,
      keywords: fields.keywords.split(','),
    };
    try {
      if (editing === undefined) engine.addPage(input);
      else engine.updatePage(editing.id, input);
      setFields(EMPTY);
      setError(null);
      onDone();
    } catch (cause) {
      if (cause instanceof ValidationError) setError(cause.message);
      else throw cause;
    }
  };

  return (
    <form onSubmit={submit}>
      <h2>{editing === undefined ? 'Cadastrar página' : `Editar página #${editing.id}`}</h2>
      <label>
        Título
        <input value={fields.title} onChange={(event) => update('title', event.target.value)} />
      </label>
      <label>
        URL
        <input value={fields.url} onChange={(event) => update('url', event.target.value)} />
      </label>
      <label>
        Palavras-chave (separadas por vírgula)
        <input value={fields.keywords} onChange={(event) => update('keywords', event.target.value)} />
      </label>
      <label>
        Conteúdo
        <textarea rows={4} value={fields.content} onChange={(event) => update('content', event.target.value)} />
      </label>
      {error !== null && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="row">
        <button type="submit">{editing === undefined ? 'Cadastrar' : 'Salvar alterações'}</button>
        {editing !== undefined && (
          <button type="button" onClick={onDone}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
