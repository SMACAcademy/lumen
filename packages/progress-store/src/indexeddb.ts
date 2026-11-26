/**
 * IndexedDB adapter: one object store of events keyed by id. No dependency,
 * and no schema beyond "a list of events", so future event types need no
 * migration. If storage is unavailable (private mode, blocked cookies), the
 * caller falls back to memory and the session still works.
 */

import type { ProgressAdapter } from "./store";
import type { ProgressEvent } from "./types";

const DB_NAME = "ise-progress";
const DB_VERSION = 1;
const STORE = "events";

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export function indexedDbAvailable(): boolean {
  try {
    return typeof indexedDB !== "undefined";
  } catch {
    return false;
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(DB_NAME, DB_VERSION);
    open.onupgradeneeded = () => {
      const db = open.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error);
    open.onblocked = () => reject(new Error("IndexedDB upgrade blocked by another tab"));
  });
}

export function indexedDbAdapter(): ProgressAdapter {
  let db: Promise<IDBDatabase> | null = null;
  const database = () => (db ??= openDb());

  const write = async (fill: (store: IDBObjectStore) => void): Promise<void> => {
    const tx = (await database()).transaction(STORE, "readwrite");
    fill(tx.objectStore(STORE));
    await done(tx);
  };

  return {
    load: async () => {
      const tx = (await database()).transaction(STORE, "readonly");
      const all = await request<ProgressEvent[]>(tx.objectStore(STORE).getAll() as IDBRequest<ProgressEvent[]>);
      return all;
    },
    append: (event) => write((store) => store.put(event)),
    replaceAll: (events) =>
      write((store) => {
        store.clear();
        for (const event of events) store.put(event);
      }),
    clear: () => write((store) => store.clear()),
  };
}

/** The browser adapter when storage works, memory otherwise — never throws at startup. */
export function browserAdapter(fallback: () => ProgressAdapter): ProgressAdapter {
  if (!indexedDbAvailable()) return fallback();
  const real = indexedDbAdapter();
  let broken: ProgressAdapter | null = null;
  const guard = async <T>(run: () => Promise<T>, whenBroken: () => Promise<T>): Promise<T> => {
    if (broken) return whenBroken();
    try {
      return await run();
    } catch {
      // Storage died mid-session (quota, private mode); keep playing in memory.
      broken = fallback();
      return whenBroken();
    }
  };
  return {
    load: () => guard(() => real.load(), () => broken!.load()),
    append: (e) => guard(() => real.append(e), () => broken!.append(e)),
    replaceAll: (e) => guard(() => real.replaceAll(e), () => broken!.replaceAll(e)),
    clear: () => guard(() => real.clear(), () => broken!.clear()),
  };
}
