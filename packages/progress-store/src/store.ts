/**
 * The store the app talks to. It owns the log, keeps a snapshot in step with
 * it, and persists through an adapter — IndexedDB in the browser, memory in
 * tests, and one day a server. Nothing above this line knows which.
 */

import { applyEvent, dayKey, emptySnapshot, reduceEvents } from "./reduce";
import type { ProgressEvent, ProgressEventInput, ProgressEventType, ProgressExport, Snapshot } from "./types";

export interface ProgressAdapter {
  load(): Promise<readonly ProgressEvent[]>;
  append(event: ProgressEvent): Promise<void>;
  replaceAll(events: readonly ProgressEvent[]): Promise<void>;
  clear(): Promise<void>;
}

const EVENT_TYPES: readonly ProgressEventType[] = [
  "day-active",
  "profile-set",
  "preference-set",
  "level-completed",
  "law-discovered",
  "formula-reviewed",
  "arcade-played",
];

/** Defensive parse for imported data: keep well-formed events of known types. */
export function parseEvents(input: unknown): ProgressEvent[] {
  const raw = Array.isArray(input) ? input : (input as ProgressExport | null)?.events;
  if (!Array.isArray(raw)) return [];
  return raw.filter((e): e is ProgressEvent => {
    const c = e as Partial<ProgressEvent> | null;
    return (
      !!c &&
      typeof c.id === "string" &&
      typeof c.at === "string" &&
      typeof c.day === "string" &&
      typeof c.type === "string" &&
      (EVENT_TYPES as readonly string[]).includes(c.type) &&
      typeof c.payload === "object" &&
      c.payload !== null
    );
  });
}

function randomId(): string {
  const c = globalThis.crypto;
  if (c && "randomUUID" in c) return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export interface ProgressStoreOptions {
  now?: () => Date;
  newId?: () => string;
}

export class ProgressStore {
  /** Resolves once the stored log has been read; the snapshot is empty until then. */
  readonly ready: Promise<void>;
  private snapshot: Snapshot = emptySnapshot();
  private events: ProgressEvent[] = [];
  private loaded = false;
  private readonly listeners = new Set<() => void>();
  private readonly now: () => Date;
  private readonly newId: () => string;

  constructor(
    private readonly adapter: ProgressAdapter,
    options: ProgressStoreOptions = {},
  ) {
    this.now = options.now ?? (() => new Date());
    this.newId = options.newId ?? randomId;
    this.ready = this.load();
  }

  private async load(): Promise<void> {
    const stored = await this.adapter.load();
    // Anything raised while loading stays, and an event the adapter already
    // wrote must not be counted twice: merge by id.
    const raised = this.events;
    const seen = new Set(stored.map((e) => e.id));
    this.events = [...stored, ...raised.filter((e) => !seen.has(e.id))];
    this.snapshot = reduceEvents(this.events);
    this.loaded = true;
    this.emit();
  }

  readonly getSnapshot = (): Snapshot => this.snapshot;

  isLoaded(): boolean {
    return this.loaded;
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  log(): readonly ProgressEvent[] {
    return this.events;
  }

  /** Record something that happened. The snapshot updates at once; the write follows. */
  append<T extends ProgressEventType>(input: ProgressEventInput<T>): Promise<void> {
    const at = this.now();
    const event = { id: this.newId(), at: at.toISOString(), day: dayKey(at), ...input } as ProgressEvent;
    this.events.push(event);
    this.snapshot = applyEvent(this.snapshot, event);
    this.emit();
    return this.adapter.append(event);
  }

  /** Record it only if nothing of that type happened today (e.g. the daily visit). */
  async appendOncePerDay<T extends ProgressEventType>(input: ProgressEventInput<T>): Promise<void> {
    await this.ready;
    const today = dayKey(this.now());
    if (this.events.some((e) => e.type === input.type && e.day === today)) return;
    await this.append(input);
  }

  export(): ProgressExport {
    return { kind: "ise-progress", version: 1, exportedAt: this.now().toISOString(), events: this.events };
  }

  /** Merge an exported log into this one: a union by event id, then replay. */
  async import(data: unknown): Promise<number> {
    await this.ready;
    const incoming = parseEvents(data);
    const known = new Set(this.events.map((e) => e.id));
    const added = incoming.filter((e) => !known.has(e.id));
    if (added.length === 0) return 0;
    this.events = [...this.events, ...added].sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
    this.snapshot = reduceEvents(this.events);
    await this.adapter.replaceAll(this.events);
    this.emit();
    return added.length;
  }

  async clear(): Promise<void> {
    this.events = [];
    this.snapshot = emptySnapshot();
    await this.adapter.clear();
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}

/** In-memory adapter: tests, server rendering, and a fallback when storage is blocked. */
export function memoryAdapter(seed: readonly ProgressEvent[] = []): ProgressAdapter {
  let events = [...seed];
  return {
    load: async () => [...events],
    append: async (event) => {
      events.push(event);
    },
    replaceAll: async (next) => {
      events = [...next];
    },
    clear: async () => {
      events = [];
    },
  };
}
