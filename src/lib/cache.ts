import { openDB, type DBSchema, type IDBPDatabase } from "idb";

interface CacheDB extends DBSchema {
  cache: {
    key: string;
    value: {
      data: unknown;
      expiresAt: number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<CacheDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<CacheDB>("crypto-terminal-cache", 1, {
      upgrade(db) {
        db.createObjectStore("cache");
      },
    });
  }
  return dbPromise;
}

const memoryCache = new Map<string, { data: unknown; expiresAt: number }>();

export async function getCached<T>(key: string): Promise<T | null> {
  const mem = memoryCache.get(key);
  if (mem && mem.expiresAt > Date.now()) return mem.data as T;
  if (mem) memoryCache.delete(key);

  try {
    const db = await getDB();
    const entry = await db.get("cache", key);
    if (entry && entry.expiresAt > Date.now()) {
      memoryCache.set(key, entry);
      return entry.data as T;
    }
    if (entry) await db.delete("cache", key);
  } catch {
    /* indexedDB unavailable */
  }

  try {
    const raw = localStorage.getItem(`ct:${key}`);
    if (raw) {
      const parsed = JSON.parse(raw) as { data: T; expiresAt: number };
      if (parsed.expiresAt > Date.now()) {
        memoryCache.set(key, parsed);
        return parsed.data;
      }
      localStorage.removeItem(`ct:${key}`);
    }
  } catch {
    /* ignore */
  }

  return null;
}

export async function setCached<T>(
  key: string,
  data: T,
  ttlMs: number
): Promise<void> {
  const entry = { data, expiresAt: Date.now() + ttlMs };
  memoryCache.set(key, entry);

  try {
    const db = await getDB();
    await db.put("cache", entry, key);
  } catch {
    /* ignore */
  }

  try {
    localStorage.setItem(`ct:${key}`, JSON.stringify(entry));
  } catch {
    /* quota exceeded */
  }
}

export function clearExpiredCache(): void {
  memoryCache.forEach((v, k) => {
    if (v.expiresAt <= Date.now()) memoryCache.delete(k);
  });
}
