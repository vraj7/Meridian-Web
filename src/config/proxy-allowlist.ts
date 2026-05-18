/** Hosts the /api/proxy route may fetch (SSRF protection). */
const ALLOWED_HOSTS = new Set([
  "api.binance.com",
  "fapi.binance.com",
  "data-api.binance.vision",
  "api-gcp.binance.com",
  "api1.binance.com",
  "api2.binance.com",
  "api3.binance.com",
  "api4.binance.com",
  "query1.finance.yahoo.com",
  "query2.finance.yahoo.com",
  "www.nseindia.com",
  "nseindia.com",
  "api.bybit.com",
  "api.bytick.com",
  "news.google.com",
  "stooq.pl",
  "www.reddit.com",
  "old.reddit.com",
  "min-api.cryptocompare.com",
  "api.coingecko.com",
  "api.coincap.io",
  "api.coinpaprika.com",
  "api.coinlore.net",
  "api.alternative.me",
]);

/** Mirror hosts to try when an upstream returns a region-block status. */
const HOST_MIRRORS: Record<string, string[]> = {
  "api.binance.com": [
    "api.binance.com",
    "data-api.binance.vision",
    "api-gcp.binance.com",
    "api1.binance.com",
    "api2.binance.com",
    "api3.binance.com",
    "api4.binance.com",
  ],
  "api.bybit.com": ["api.bybit.com", "api.bytick.com"],
};

export function getProxyMirrorHosts(hostname: string): string[] {
  return HOST_MIRRORS[hostname] ?? [hostname];
}

export function isProxyUrlAllowed(url: URL): boolean {
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  const host = url.hostname.toLowerCase();
  return ALLOWED_HOSTS.has(host);
}

export function buildProxyHeaders(target: URL): HeadersInit {
  const ua =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

  if (target.hostname.includes("nseindia.com")) {
    return {
      "User-Agent": ua,
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9",
      Referer: "https://www.nseindia.com/",
    };
  }

  if (target.hostname.includes("finance.yahoo.com")) {
    return {
      "User-Agent": ua,
      Accept: "application/json",
    };
  }

  if (target.hostname.includes("reddit.com")) {
    return {
      "User-Agent": "Meridian/1.0 (educational app)",
      Accept: "application/json",
    };
  }

  if (target.hostname.includes("binance.com")) {
    return { Accept: "application/json" };
  }

  return { "User-Agent": ua, Accept: "*/*" };
}
