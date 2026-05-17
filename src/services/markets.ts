import { API_PROVIDERS, CACHE_TTL } from "@/config/api";
import {
  DELTA_FUTURES_ASSETS,
  DELTA_FUTURES_BY_SYMBOL,
  filterToDeltaFuturesMarkets,
} from "@/config/delta-exchange-futures";
import { QUOTE_CURRENCY } from "@/config/market";
import { DEMO_MARKETS } from "@/data/demo";
import { axiosGet, fetchWithFallback } from "@/lib/api-client";
import type { CoinMarket } from "@/types";

const DELTA_COINGECKO_IDS = DELTA_FUTURES_ASSETS.map((a) => a.coingeckoId);
const COINGECKO_ID_CHUNK = 50;

async function fetchCoinGeckoDeltaMarkets(): Promise<CoinGeckoMarket[]> {
  const chunks: string[][] = [];
  for (let i = 0; i < DELTA_COINGECKO_IDS.length; i += COINGECKO_ID_CHUNK) {
    chunks.push(DELTA_COINGECKO_IDS.slice(i, i + COINGECKO_ID_CHUNK));
  }
  const batches = await Promise.all(
    chunks.map((ids) =>
      axiosGet<CoinGeckoMarket[]>(
        `${API_PROVIDERS.coingecko.baseUrl}/coins/markets?vs_currency=usd&ids=${ids.join(",")}&order=market_cap_desc&sparkline=false&price_change_percentage=24h,7d`
      )
    )
  );
  return batches.flat();
}

interface CoinGeckoMarket {
  id: string;
  symbol: string;
  name: string;
  image: string;
  market_cap_rank: number;
  current_price: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d_in_currency?: number;
  market_cap: number;
  total_volume: number;
  high_24h?: number;
  low_24h?: number;
}

interface CoinCapAsset {
  id: string;
  rank: string;
  symbol: string;
  name: string;
  priceUsd: string;
  changePercent24Hr: string;
  marketCapUsd: string;
  volumeUsd24Hr: string;
}

function mapCoinGecko(c: CoinGeckoMarket): CoinMarket {
  const meta = DELTA_FUTURES_BY_SYMBOL.get(c.symbol.toUpperCase());
  return {
    id: c.id,
    symbol: (meta?.symbol ?? c.symbol).toUpperCase(),
    name: meta?.name ?? c.name,
    image: c.image,
    rank: c.market_cap_rank,
    quoteCurrency: QUOTE_CURRENCY,
    price: c.current_price,
    change24h: c.price_change_percentage_24h ?? 0,
    change7d: c.price_change_percentage_7d_in_currency,
    marketCap: c.market_cap,
    volume24h: c.total_volume,
    high24h: c.high_24h,
    low24h: c.low_24h,
  };
}

function sortDeltaMarkets(markets: CoinMarket[]): CoinMarket[] {
  return filterToDeltaFuturesMarkets(markets).sort((a, b) => {
    const ra = a.rank > 0 ? a.rank : 9999;
    const rb = b.rank > 0 ? b.rank : 9999;
    return ra - rb;
  });
}

/** Markets limited to Delta Exchange perpetual futures underlyings (no stables). */
export async function fetchTop50Markets(demoMode = false): Promise<CoinMarket[]> {
  if (demoMode) return DEMO_MARKETS;

  return fetchWithFallback({
    cacheKey: "delta-futures-markets",
    cacheTtl: CACHE_TTL.markets,
    demoFallback: () => DEMO_MARKETS,
    providers: [
      {
        name: "coingecko",
        fetch: async () => {
          const data = await fetchCoinGeckoDeltaMarkets();
          return sortDeltaMarkets(data.map(mapCoinGecko));
        },
      },
      {
        name: "coincap",
        fetch: async () => {
          const res = await axiosGet<{ data: CoinCapAsset[] }>(
            `${API_PROVIDERS.coincap.baseUrl}/assets?limit=200`
          );
          const mapped = res.data
            .map((c) => ({
              id: DELTA_FUTURES_BY_SYMBOL.get(c.symbol.toUpperCase())?.coingeckoId ?? c.id,
              symbol: c.symbol.toUpperCase(),
              name: DELTA_FUTURES_BY_SYMBOL.get(c.symbol.toUpperCase())?.name ?? c.name,
              image: "",
              rank: parseInt(c.rank, 10),
              quoteCurrency: QUOTE_CURRENCY,
              price: parseFloat(c.priceUsd),
              change24h: parseFloat(c.changePercent24Hr),
              marketCap: parseFloat(c.marketCapUsd),
              volume24h: parseFloat(c.volumeUsd24Hr),
            }))
            .filter((m) => DELTA_FUTURES_BY_SYMBOL.has(m.symbol));
          return sortDeltaMarkets(mapped);
        },
      },
      {
        name: "coinpaprika",
        fetch: async () => {
          const data = await axiosGet<
            Array<{
              id: string;
              rank: number;
              symbol: string;
              name: string;
              quotes: {
                USD: {
                  price: number;
                  percent_change_24h: number;
                  market_cap: number;
                  volume_24h: number;
                };
              };
            }>
          >(`${API_PROVIDERS.coinpaprika.baseUrl}/tickers`);
          const mapped = data
            .filter((c) => DELTA_FUTURES_BY_SYMBOL.has(c.symbol.toUpperCase()))
            .map((c) => ({
              id: c.id,
              symbol: c.symbol.toUpperCase(),
              name: DELTA_FUTURES_BY_SYMBOL.get(c.symbol.toUpperCase())?.name ?? c.name,
              image: "",
              rank: c.rank,
              quoteCurrency: QUOTE_CURRENCY,
              price: c.quotes.USD.price,
              change24h: c.quotes.USD.percent_change_24h,
              marketCap: c.quotes.USD.market_cap,
              volume24h: c.quotes.USD.volume_24h,
            }));
          return sortDeltaMarkets(mapped);
        },
      },
    ],
  });
}

export async function fetchBtcDominance(demoMode = false): Promise<number> {
  if (demoMode) return 54.2;

  return fetchWithFallback({
    cacheKey: "btc-dominance",
    cacheTtl: CACHE_TTL.dominance,
    demoFallback: () => 54.2,
    providers: [
      {
        name: "coingecko",
        fetch: async () => {
          const data = await axiosGet<{ market_cap_percentage: { btc: number } }>(
            `${API_PROVIDERS.coingecko.baseUrl}/global`
          );
          return data.market_cap_percentage.btc;
        },
      },
    ],
  });
}
