// ponytail: in-memory stand-in for the Firestore subset the services use, so
// service tests run without Java/the emulator. Swap for `firebase emulators:exec`
// if a test ever needs transactions, real indexes, or security rules.

type Doc = Record<string, unknown>;

const INCREMENT = Symbol('increment');

interface Increment {
  [INCREMENT]: number;
}

function isIncrement(v: unknown): v is Increment {
  return typeof v === 'object' && v !== null && INCREMENT in v;
}

export interface FakeQueryDoc {
  id: string;
  exists: boolean;
  data: () => Doc | undefined;
  ref: { update: (patch: Doc) => Promise<void> };
}

export interface FakeSnapshot {
  docs: FakeQueryDoc[];
  empty: boolean;
  size: number;
  forEach: (fn: (doc: FakeQueryDoc) => void) => void;
}

type Filter = { field: string; op: string; value: unknown };

function readPath(doc: Doc, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Doc)[key];
    return undefined;
  }, doc);
}

function matches(doc: Doc, f: Filter): boolean {
  const actual = readPath(doc, f.field);
  switch (f.op) {
    case '==':
      return actual === f.value;
    case '!=':
      return actual !== f.value;
    case '>':
      return (actual as number) > (f.value as number);
    case '>=':
      return (actual as number) >= (f.value as number);
    case '<':
      return (actual as number) < (f.value as number);
    case '<=':
      return (actual as number) <= (f.value as number);
    case 'in':
      return Array.isArray(f.value) && f.value.includes(actual);
    case 'array-contains':
      return Array.isArray(actual) && actual.includes(f.value);
    default:
      throw new Error(`fake-firestore: unsupported operator "${f.op}"`);
  }
}

export class FakeFirestore {
  private store = new Map<string, Map<string, Doc>>();
  private seq = 0;

  private col(name: string): Map<string, Doc> {
    let c = this.store.get(name);
    if (!c) {
      c = new Map();
      this.store.set(name, c);
    }
    return c;
  }

  reset(): void {
    this.store.clear();
    this.seq = 0;
  }

  // Test-side helper: preload documents without going through the query API.
  seed(collection: string, docs: Record<string, Doc>): void {
    const c = this.col(collection);
    for (const [id, data] of Object.entries(docs)) c.set(id, { ...data });
  }

  raw(collection: string, id: string): Doc | undefined {
    return this.store.get(collection)?.get(id);
  }

  count(collection: string): number {
    return this.store.get(collection)?.size ?? 0;
  }

  collection(name: string): FakeQuery {
    return new FakeQuery(this, name, []);
  }

  batch() {
    const ops: Array<() => Promise<void>> = [];
    return {
      set: (ref: { set: (d: Doc) => Promise<void> }, data: Doc) => {
        ops.push(() => ref.set(data));
      },
      update: (ref: { update: (d: Doc) => Promise<void> }, patch: Doc) => {
        ops.push(() => ref.update(patch));
      },
      delete: (ref: { delete: () => Promise<void> }) => {
        ops.push(() => ref.delete());
      },
      commit: async () => {
        for (const op of ops) await op();
      },
    };
  }

  private applyPatch(target: Doc, patch: Doc): void {
    for (const [k, v] of Object.entries(patch)) {
      if (isIncrement(v)) {
        target[k] = ((target[k] as number) ?? 0) + v[INCREMENT];
      } else {
        target[k] = v;
      }
    }
  }

  docRef(collection: string, id: string) {
    const c = this.col(collection);
    return {
      id,
      get: async () => this.snapshotFor(collection, id),
      set: async (data: Doc) => {
        c.set(id, { ...data });
      },
      update: async (patch: Doc) => {
        const existing = c.get(id);
        if (!existing) throw new Error(`fake-firestore: no document ${collection}/${id}`);
        this.applyPatch(existing, patch);
      },
      delete: async () => {
        c.delete(id);
      },
    };
  }

  snapshotFor(collection: string, id: string): FakeQueryDoc {
    const data = this.store.get(collection)?.get(id);
    return {
      id,
      exists: data !== undefined,
      data: () => (data ? { ...data } : undefined),
      ref: this.docRef(collection, id),
    };
  }

  newId(): string {
    this.seq += 1;
    return `fake-id-${this.seq}`;
  }

  entries(collection: string): Array<[string, Doc]> {
    return [...(this.store.get(collection) ?? new Map<string, Doc>()).entries()];
  }
}

type Order = { field: string; dir: 'asc' | 'desc' };

export class FakeQuery {
  constructor(
    private fs: FakeFirestore,
    private name: string,
    private filters: Filter[],
    private orders: Order[] = [],
    private max?: number,
    private skip = 0
  ) {}

  private clone(patch: Partial<{ filters: Filter[]; orders: Order[]; max: number; skip: number }>) {
    return new FakeQuery(
      this.fs,
      this.name,
      patch.filters ?? this.filters,
      patch.orders ?? this.orders,
      patch.max ?? this.max,
      patch.skip ?? this.skip
    );
  }

  where(field: string, op: string, value: unknown): FakeQuery {
    return this.clone({ filters: [...this.filters, { field, op, value }] });
  }

  // Firestore applies chained orderBy calls in sequence, so they accumulate.
  orderBy(field: string, dir: 'asc' | 'desc' = 'asc'): FakeQuery {
    return this.clone({ orders: [...this.orders, { field, dir }] });
  }

  limit(n: number): FakeQuery {
    return this.clone({ max: n });
  }

  offset(n: number): FakeQuery {
    return this.clone({ skip: n });
  }

  doc(id?: string) {
    return this.fs.docRef(this.name, id ?? this.fs.newId());
  }

  async add(data: Doc) {
    const ref = this.doc();
    await ref.set(data);
    return ref;
  }

  async get(): Promise<FakeSnapshot> {
    let rows = this.fs
      .entries(this.name)
      .filter(([, doc]) => this.filters.every(f => matches(doc, f)));

    if (this.orders.length > 0) {
      rows = [...rows].sort(([, a], [, b]) => {
        for (const { field, dir } of this.orders) {
          const x = readPath(a, field) as never;
          const y = readPath(b, field) as never;
          const cmp = x < y ? -1 : x > y ? 1 : 0;
          if (cmp !== 0) return dir === 'desc' ? -cmp : cmp;
        }
        return 0;
      });
    }

    rows = rows.slice(this.skip, this.max === undefined ? undefined : this.skip + this.max);

    const docs = rows.map(([id]) => this.fs.snapshotFor(this.name, id));
    return {
      docs,
      empty: docs.length === 0,
      size: docs.length,
      forEach: fn => docs.forEach(fn),
    };
  }
}

export const FieldValue = {
  increment: (n: number): Increment => ({ [INCREMENT]: n }),
};
