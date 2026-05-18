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

  if (
    target.hostname.includes("bybit.com") ||
    target.hostname.includes("bytick.com")
  ) {
    // Bybit's Cloudflare layer rejects unadorned cloud-IP requests with 403.
    // A full browser-like header set (UA + Accept-Language + Origin + Referer)
    // is enough to look like a real client without any auth.
    return {
      "User-Agent": ua,
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      Origin: "https://www.bybit.com",
      Referer: "https://www.bybit.com/",
      "sec-ch-ua":
        '"Chromium";v="120", "Google Chrome";v="120", "Not?A_Brand";v="24"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
    };
  }

  if (target.hostname.includes("cryptocompare.com")) {
    return {
      "User-Agent": ua,
      Accept: "application/json",
      "Accept-Language": "en-US,en;q=0.9",
    };
  }

  if (target.hostname.includes("coingecko.com")) {
    return {
      "User-Agent": ua,
      Accept: "application/json",
      "Accept-Language": "en-US,en;q=0.9",
    };
  }

  return { "User-Agent": ua, Accept: "*/*" };
}
