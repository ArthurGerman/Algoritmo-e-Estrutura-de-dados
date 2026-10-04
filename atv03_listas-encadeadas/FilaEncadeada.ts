import { Node } from './Node';

export class FilaEncadeada<T> {
    private head: Node<T> | null = null;
    private tail: Node<T> | null = null;
    private size: number = 0;

    public enqueue(data: T): void {
        const newNode = new Node(data);
        if (!this.head) {
            this.head = newNode;
            this.tail = newNode;
        } else {
            if (this.tail) {
                this.tail.next = newNode;
                this.tail = newNode;
            }
        }
        this.size++;
    }

    public dequeue(): T | null {
        if (!this.head) return null;
        const removedData = this.head.data;
        this.head = this.head.next;
        if (!this.head) {
            this.tail = null;
        }
        this.size--;
        return removedData;
    }

    public peek(): T | null {
        return this.head ? this.head.data : null;
    }

    public toArray(): T[] {
        const items: T[] = [];
        let current = this.head;

        while (current) {
            items.push(current.data);
            current = current.next;
        }

        return items;
    }

    public isEmpty(): boolean {
        return this.head === null;
    }

    public getSize(): number {
        return this.size;
    }
}