/** Fixed-capacity buffer that overwrites its oldest entry; no allocation after construction. */
export class RingBuffer<T> {
  private items: (T | undefined)[];
  private next = 0;
  private count = 0;

  constructor(readonly capacity: number) {
    this.items = new Array<T | undefined>(capacity);
  }

  push(item: T): void {
    this.items[this.next] = item;
    this.next = (this.next + 1) % this.capacity;
    if (this.count < this.capacity) this.count++;
  }

  /** Visits entries from oldest to newest. */
  forEach(visit: (item: T) => void): void {
    const start = (this.next - this.count + this.capacity) % this.capacity;
    for (let i = 0; i < this.count; i++) visit(this.items[(start + i) % this.capacity] as T);
  }

  get size(): number {
    return this.count;
  }

  clear(): void {
    this.items.fill(undefined);
    this.next = 0;
    this.count = 0;
  }
}
