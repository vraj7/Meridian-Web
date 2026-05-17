const inflight = new Map<string, Promise<unknown>>();

/** Coalesce identical in-flight async work (per tab). */
export function dedupeAsync<T>(key: string, factory: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;

  const promise = factory().finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, promise);
  return promise;
}
