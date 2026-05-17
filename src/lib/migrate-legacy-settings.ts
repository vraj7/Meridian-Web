/** One-time copy from the old combined settings blob into crypto + India stores. */
export function migrateLegacySettings(): void {
  if (typeof window === "undefined") return;

  const legacyKey = "crypto-terminal-settings";
  const cryptoKey = "meridian-crypto-settings";
  const indiaKey = "meridian-india-settings";

  if (localStorage.getItem(cryptoKey) || localStorage.getItem(indiaKey)) return;

  const raw = localStorage.getItem(legacyKey);
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw) as { state?: Record<string, unknown> };
    const s = parsed.state;
    if (!s || typeof s !== "object") return;

    const shared = {
      minConfidence: typeof s.minConfidence === "number" ? s.minConfidence : 55,
      demoMode: Boolean(s.demoMode),
      defaultTimeframe: s.defaultTimeframe ?? "1h",
      refreshInterval: typeof s.refreshInterval === "number" ? s.refreshInterval : 60_000,
    };

    const cryptoState = {
      ...shared,
      relaxedCryptoSignals: Boolean(s.relaxedCryptoSignals),
      signalLockMinutes: typeof s.signalLockMinutes === "number" ? s.signalLockMinutes : 15,
    };

    const indiaState = {
      ...shared,
      defaultTimeframe: s.defaultTimeframe === "1m" || s.defaultTimeframe === "5m" ? "15m" : shared.defaultTimeframe,
    };

    localStorage.setItem(cryptoKey, JSON.stringify({ state: cryptoState, version: 0 }));
    localStorage.setItem(indiaKey, JSON.stringify({ state: indiaState, version: 0 }));

    if (typeof s.notifications === "boolean") {
      localStorage.setItem(
        "meridian-app-settings",
        JSON.stringify({ state: { notifications: s.notifications }, version: 0 })
      );
    }
  } catch {
    /* ignore corrupt legacy data */
  }
}
