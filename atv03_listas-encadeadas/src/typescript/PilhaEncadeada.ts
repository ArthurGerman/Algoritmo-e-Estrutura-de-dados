import { Node } from './Node.js';

/** Pilha (LIFO) baseada em lista encadeada. Usada no histórico de atendimentos finalizados. */
export class PilhaEncadeada<T> {
    private topo: Node<T> | null = null;
    private size = 0;

    public push(data: T): void {
        const novo = new Node(data);
        novo.next = this.topo;
        this.topo = novo;
        this.size++;
    }

    public pop(): T | null {
        if (!this.topo) return null;
        const data = this.topo.data;
        this.topo = this.topo.next;
        this.size--;
        return data;
    }

    public peek(): T | null {
        return this.topo ? this.topo.data : null;
    }

    /** Do topo para a base (mais recente primeiro). */
    public toArray(): T[] {
        const itens: T[] = [];
        let atual = this.topo;
        while (atual) {
            itens.push(atual.data);
            atual = atual.next;
        }
        return itens;
    }

    public isEmpty(): boolean {
        return this.topo === null;
    }

    public getSize(): number {
        return this.size;
    }
}
