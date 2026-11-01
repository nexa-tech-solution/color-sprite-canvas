/**
 * Minimal IndexedDB wrapper for project persistence.
 *
 * localStorage on iOS WKWebView caps out around 5MB, and a single imported
 * photo (stored as a data URL) can blow through that, silently losing work.
 * IndexedDB has no such small cap and writes one project at a time.
 */
const DB_NAME = "pastel-paint";
const DB_VERSION = 1;
const STORE = "projects";

let dbPromise: Promise<IDBDatabase> | null = null;

export function isIndexedDbAvailable() {
  return typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      // If iOS tears the connection down (memory pressure / background), reopen next time.
      db.onclose = () => {
        dbPromise = null;
      };
      resolve(db);
    };
    request.onerror = () => {
      dbPromise = null;
      reject(request.error ?? new Error("IndexedDB open failed"));
    };
    request.onblocked = () => {
      dbPromise = null;
      reject(new Error("IndexedDB open blocked"));
    };
  });

  return dbPromise;
}

function run<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | undefined> {
  return openDb().then(
    (db) =>
      new Promise<T | undefined>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const request = action(tx.objectStore(STORE));
        tx.oncomplete = () => resolve(request ? request.result : undefined);
        tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
        tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
      }),
  );
}

export function dbGetAll<T>(): Promise<T[]> {
  return run<T[]>("readonly", (store) => store.getAll() as IDBRequest<T[]>).then(
    (value) => value ?? [],
  );
}

export function dbPut<T>(value: T): Promise<void> {
  return run("readwrite", (store) => {
    store.put(value);
  }).then(() => undefined);
}

export function dbPutMany<T>(values: T[]): Promise<void> {
  return run("readwrite", (store) => {
    for (const value of values) store.put(value);
  }).then(() => undefined);
}

export function dbDelete(id: string): Promise<void> {
  return run("readwrite", (store) => {
    store.delete(id);
  }).then(() => undefined);
}

/** Ask the browser not to evict our data under storage pressure (best effort). */
export function requestPersistentStorage() {
  try {
    void navigator.storage?.persist?.().catch(() => {});
  } catch {
    // Unsupported — nothing to do.
  }
}
