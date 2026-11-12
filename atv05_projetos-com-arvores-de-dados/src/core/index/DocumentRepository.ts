import { AvlTree } from '../tree/AvlTree';
import type { TreeViewNode } from '../tree/TreeView';
import type { IndexedPage } from '../types';

/**
 * Armazena as páginas em uma árvore AVL, usando o id como chave.
 * Ids nunca são reaproveitados, mesmo depois de uma remoção.
 */
export class DocumentRepository {
  private readonly tree = new AvlTree<number, IndexedPage>((a, b) => a - b);
  private nextId = 1;

  get size(): number {
    return this.tree.size;
  }

  get height(): number {
    return this.tree.height;
  }

  allocateId(): number {
    return this.nextId++;
  }

  put(record: IndexedPage): void {
    this.tree.set(record.page.id, record);
  }

  get(id: number): IndexedPage | undefined {
    return this.tree.get(id);
  }

  remove(id: number): boolean {
    return this.tree.delete(id);
  }

  /** Registros em ordem crescente de id (percurso em ordem da AVL). */
  list(): IndexedPage[] {
    return [...this.tree.values()];
  }

  toTreeView(maxDepth?: number): TreeViewNode | null {
    return this.tree.toTreeView(
      (id, record) => ({ label: `#${id}`, detail: record.page.title }),
      maxDepth,
    );
  }
}
