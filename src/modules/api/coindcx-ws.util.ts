/** CoinDCX socket.io events nest payload inside JSON strings. */
export function parseCoindcxWsPayload(raw: unknown): unknown {
  if (raw == null) return null;
  let payload: unknown = raw;
  if (typeof payload === 'object' && payload !== null && 'data' in payload) {
    payload = (payload as { data: unknown }).data;
  }
  if (typeof payload === 'string') {
    try {
      return JSON.parse(payload);
    } catch {
      return null;
    }
  }
  return payload;
}
