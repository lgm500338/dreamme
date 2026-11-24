import { DreamMeStore } from '../types/dream';

/**
 * Big pictures (uploaded places, postcards) live in IndexedDB, which can hold hundreds of
 * megabytes, instead of localStorage (≈5 MB). The JSON store only keeps "idb:<id>" references.
 * Everything stays on this device.
 */

const DB_NAME = 'dreamme_images';
const STORE = 'images';
export const REF_PREFIX = 'idb:';

let dbPromise: Promise<IDBDatabase | null> | null = null;

const openDb = (): Promise<IDBDatabase | null> => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
};

const tx = <T>(db: IDBDatabase, mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T> | void) =>
  new Promise<T | undefined>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const r = run(t.objectStore(STORE));
    t.oncomplete = () => resolve(r ? r.result : undefined);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });

/** data URL → id, so the same picture is written once */
const idByData = new Map<string, string>();
const written = new Set<string>();

const isData = (v: unknown): v is string => typeof v === 'string' && v.startsWith('data:image/');
export const isRef = (v: unknown): v is string => typeof v === 'string' && v.startsWith(REF_PREFIX);

const newId = () => `img_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

let persistAsked = false;

/**
 * Writes every inline picture of the store to IndexedDB and returns a copy that only holds
 * references. If IndexedDB is not available, returns the store unchanged (old behaviour).
 */
export async function externalizeImages(store: DreamMeStore): Promise<DreamMeStore> {
  const db = await openDb();
  if (!db) return store;

  const toWrite: Array<[string, string]> = [];
  const ref = (v: string | null | undefined): string | null | undefined => {
    if (!isData(v)) return v;
    let id = idByData.get(v);
    if (!id) {
      id = newId();
      idByData.set(v, id);
    }
    if (!written.has(id)) toWrite.push([id, v]);
    return REF_PREFIX + id;
  };

  const out: DreamMeStore = {
    ...store,
    customDreams: store.customDreams.map((d) => ({ ...d, customImage: ref(d.customImage) })),
    dreamDaySlots: store.dreamDaySlots.map((s) => ({ ...s, customImage: ref(s.customImage) })),
    snapshots: store.snapshots.map((s) => ({ ...s, imageDataUrl: ref(s.imageDataUrl) as string })),
  };

  if (toWrite.length) {
    try {
      await tx(db, 'readwrite', (s) => {
        toWrite.forEach(([id, data]) => s.put(data, id));
      });
      toWrite.forEach(([id]) => written.add(id));
    } catch {
      return store; // quota or private mode: keep pictures inline rather than lose them
    }
    if (!persistAsked) {
      persistAsked = true;
      navigator.storage?.persist?.().catch(() => {});
    }
  }

  // forget pictures nothing points to any more (deleted dreams / chapters / postcards)
  try {
    const used = new Set<string>();
    const note = (v: unknown) => isRef(v) && used.add(v.slice(REF_PREFIX.length));
    out.customDreams.forEach((d) => note(d.customImage));
    out.dreamDaySlots.forEach((s) => note(s.customImage));
    out.snapshots.forEach((s) => note(s.imageDataUrl));
    const keys = ((await tx(db, 'readonly', (s) => s.getAllKeys())) ?? []) as IDBValidKey[];
    const stale = keys.filter((k) => !used.has(String(k)));
    if (stale.length) {
      await tx(db, 'readwrite', (s) => {
        stale.forEach((k) => s.delete(k));
      });
      stale.forEach((k) => written.delete(String(k)));
    }
  } catch {
    /* cleanup is best-effort */
  }
  return out;
}

/** Loads the pictures behind every "idb:" reference: ref → data URL (missing ones are left out). */
export async function loadReferencedImages(store: DreamMeStore): Promise<Map<string, string>> {
  const refs = new Set<string>();
  const note = (v: unknown) => isRef(v) && refs.add(v);
  store.customDreams.forEach((d) => note(d.customImage));
  store.dreamDaySlots.forEach((s) => note(s.customImage));
  store.snapshots.forEach((s) => note(s.imageDataUrl));
  const found = new Map<string, string>();
  if (!refs.size) return found;
  const db = await openDb();
  if (!db) return found;
  await Promise.all(
    Array.from(refs).map(async (r) => {
      const id = r.slice(REF_PREFIX.length);
      try {
        const data = (await tx(db, 'readonly', (s) => s.get(id))) as string | undefined;
        if (typeof data === 'string') {
          found.set(r, data);
          idByData.set(data, id);
          written.add(id);
        }
      } catch {
        /* ignore */
      }
    })
  );
  return found;
}

/** Swaps references for loaded pictures; references whose picture is gone become null / are dropped. */
export function resolveImageRefs(store: DreamMeStore, images: Map<string, string>): DreamMeStore {
  const res = (v: string | null | undefined) => (isRef(v) ? images.get(v) ?? null : v);
  return {
    ...store,
    customDreams: store.customDreams.map((d) => ({ ...d, customImage: res(d.customImage) })),
    dreamDaySlots: store.dreamDaySlots.map((s) => ({ ...s, customImage: res(s.customImage) })),
    snapshots: store.snapshots
      .map((s) => ({ ...s, imageDataUrl: res(s.imageDataUrl) as string }))
      .filter((s) => !!s.imageDataUrl),
  };
}
