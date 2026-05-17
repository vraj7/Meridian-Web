/**
 * Perpetual futures underlyings listed on Delta Exchange (USD-quoted perps).
 * Curated from public https://www.delta.exchange/futures-guide-* pages (no Delta API).
 * Last verified: May 2026 — update if Delta adds/removes contracts.
 */
export interface DeltaFuturesAsset {
  /** Ticker used in-app and on Binance (BASEUSDT). */
  symbol: string;
  /** CoinGecko API id for market data. */
  coingeckoId: string;
  name: string;
}

/** Stablecoins / wrapped USD / non-tradeable bases — never show as a coin row. */
export const DELTA_EXCLUDED_SYMBOLS = new Set([
  "USD",
  "USDT",
  "USDC",
  "BUSD",
  "DAI",
  "TUSD",
  "FDUSD",
  "USDP",
  "USDS",
  "WBT",
  "EUR",
  "GBP",
]);

/** Delta Exchange perpetual futures underlyings (spot data via CoinGecko). */
export const DELTA_FUTURES_ASSETS: DeltaFuturesAsset[] = [
  { symbol: "BTC", coingeckoId: "bitcoin", name: "Bitcoin" },
  { symbol: "ETH", coingeckoId: "ethereum", name: "Ethereum" },
  { symbol: "SOL", coingeckoId: "solana", name: "Solana" },
  { symbol: "XRP", coingeckoId: "ripple", name: "XRP" },
  { symbol: "BNB", coingeckoId: "binancecoin", name: "BNB" },
  { symbol: "ADA", coingeckoId: "cardano", name: "Cardano" },
  { symbol: "DOGE", coingeckoId: "dogecoin", name: "Dogecoin" },
  { symbol: "AVAX", coingeckoId: "avalanche-2", name: "Avalanche" },
  { symbol: "LINK", coingeckoId: "chainlink", name: "Chainlink" },
  { symbol: "DOT", coingeckoId: "polkadot", name: "Polkadot" },
  { symbol: "TRX", coingeckoId: "tron", name: "TRON" },
  { symbol: "LTC", coingeckoId: "litecoin", name: "Litecoin" },
  { symbol: "UNI", coingeckoId: "uniswap", name: "Uniswap" },
  { symbol: "XLM", coingeckoId: "stellar", name: "Stellar" },
  { symbol: "XMR", coingeckoId: "monero", name: "Monero" },
  { symbol: "SUI", coingeckoId: "sui", name: "Sui" },
  { symbol: "APT", coingeckoId: "aptos", name: "Aptos" },
  { symbol: "ARB", coingeckoId: "arbitrum", name: "Arbitrum" },
  { symbol: "OP", coingeckoId: "optimism", name: "Optimism" },
  { symbol: "INJ", coingeckoId: "injective-protocol", name: "Injective" },
  { symbol: "FIL", coingeckoId: "filecoin", name: "Filecoin" },
  { symbol: "HBAR", coingeckoId: "hedera-hashgraph", name: "Hedera" },
  { symbol: "MANA", coingeckoId: "decentraland", name: "Decentraland" },
  { symbol: "IOTA", coingeckoId: "iota", name: "IOTA" },
  { symbol: "ZEC", coingeckoId: "zcash", name: "Zcash" },
  { symbol: "DASH", coingeckoId: "dash", name: "Dash" },
  { symbol: "WLD", coingeckoId: "worldcoin-wld", name: "Worldcoin" },
  { symbol: "SEI", coingeckoId: "sei-network", name: "Sei" },
  { symbol: "STRK", coingeckoId: "starknet", name: "Starknet" },
  { symbol: "AAVE", coingeckoId: "aave", name: "Aave" },
  { symbol: "GALA", coingeckoId: "gala", name: "Gala" },
  { symbol: "BCH", coingeckoId: "bitcoin-cash", name: "Bitcoin Cash" },
  { symbol: "BLUR", coingeckoId: "blur", name: "Blur" },
  { symbol: "TIA", coingeckoId: "celestia", name: "Celestia" },
  { symbol: "DOGS", coingeckoId: "dogs-2", name: "DOGS" },
  { symbol: "WIF", coingeckoId: "dogwifcoin", name: "dogwifhat" },
  { symbol: "DYDX", coingeckoId: "dydx-chain", name: "dYdX" },
  { symbol: "ENA", coingeckoId: "ethena", name: "Ethena" },
  { symbol: "JTO", coingeckoId: "jito-governance-token", name: "Jito" },
  { symbol: "JUP", coingeckoId: "jupiter-exchange-solana", name: "Jupiter" },
  { symbol: "KSM", coingeckoId: "kusama", name: "Kusama" },
  { symbol: "LDO", coingeckoId: "lido-dao", name: "Lido DAO" },
  { symbol: "MANTA", coingeckoId: "manta-network", name: "Manta Network" },
  { symbol: "MEME", coingeckoId: "memecoin-2", name: "Memecoin" },
  { symbol: "NOT", coingeckoId: "notcoin", name: "Notcoin" },
  { symbol: "ONDO", coingeckoId: "ondo-finance", name: "Ondo" },
  { symbol: "ORDI", coingeckoId: "ordinals", name: "ORDI" },
  { symbol: "PENDLE", coingeckoId: "pendle", name: "Pendle" },
  { symbol: "POL", coingeckoId: "polygon-ecosystem-token", name: "Polygon" },
  { symbol: "STX", coingeckoId: "blockstack", name: "Stacks" },
  { symbol: "RUNE", coingeckoId: "thorchain", name: "THORChain" },
  { symbol: "TON", coingeckoId: "the-open-network", name: "Toncoin" },
  { symbol: "AXS", coingeckoId: "axie-infinity", name: "Axie Infinity" },
  { symbol: "1000SATS", coingeckoId: "1000sats-ordinals", name: "1000SATS" },
  { symbol: "NEAR", coingeckoId: "near", name: "NEAR Protocol" },
  { symbol: "ATOM", coingeckoId: "cosmos", name: "Cosmos" },
  { symbol: "SHIB", coingeckoId: "shiba-inu", name: "Shiba Inu" },
  { symbol: "PEPE", coingeckoId: "pepe", name: "Pepe" },
  { symbol: "BONK", coingeckoId: "bonk", name: "Bonk" },
  { symbol: "FET", coingeckoId: "fetch-ai", name: "Fetch.ai" },
  { symbol: "RENDER", coingeckoId: "render-token", name: "Render" },
  { symbol: "IMX", coingeckoId: "immutable-x", name: "Immutable" },
  { symbol: "SAND", coingeckoId: "the-sandbox", name: "The Sandbox" },
  { symbol: "ALGO", coingeckoId: "algorand", name: "Algorand" },
  { symbol: "VET", coingeckoId: "vechain", name: "VeChain" },
  { symbol: "CRV", coingeckoId: "curve-dao-token", name: "Curve DAO" },
  { symbol: "MKR", coingeckoId: "maker", name: "Maker" },
  { symbol: "SNX", coingeckoId: "havven", name: "Synthetix" },
  { symbol: "ENS", coingeckoId: "ethereum-name-service", name: "ENS" },
  { symbol: "GRT", coingeckoId: "the-graph", name: "The Graph" },
  { symbol: "APE", coingeckoId: "apecoin", name: "ApeCoin" },
  { symbol: "GMT", coingeckoId: "stepn", name: "GMT" },
  { symbol: "CHZ", coingeckoId: "chiliz", name: "Chiliz" },
  { symbol: "ETC", coingeckoId: "ethereum-classic", name: "Ethereum Classic" },
  { symbol: "THETA", coingeckoId: "theta-token", name: "Theta Network" },
  { symbol: "EGLD", coingeckoId: "elrond-erd-2", name: "MultiversX" },
  { symbol: "FLOW", coingeckoId: "flow", name: "Flow" },
  { symbol: "XTZ", coingeckoId: "tezos", name: "Tezos" },
  { symbol: "COMP", coingeckoId: "compound-governance-token", name: "Compound" },
  { symbol: "1INCH", coingeckoId: "1inch", name: "1inch" },
  { symbol: "ROSE", coingeckoId: "oasis-network", name: "Oasis" },
  { symbol: "MINA", coingeckoId: "mina-protocol", name: "Mina" },
  { symbol: "CELO", coingeckoId: "celo", name: "Celo" },
  { symbol: "LRC", coingeckoId: "loopring", name: "Loopring" },
  { symbol: "AR", coingeckoId: "arweave", name: "Arweave" },
  { symbol: "RPL", coingeckoId: "rocket-pool", name: "Rocket Pool" },
  { symbol: "ETHFI", coingeckoId: "ether-fi", name: "ether.fi" },
  { symbol: "EIGEN", coingeckoId: "eigenlayer", name: "EigenLayer" },
  { symbol: "ZRO", coingeckoId: "layerzero", name: "LayerZero" },
  { symbol: "W", coingeckoId: "wormhole", name: "Wormhole" },
  { symbol: "TAO", coingeckoId: "bittensor", name: "Bittensor" },
  { symbol: "FLOKI", coingeckoId: "floki", name: "FLOKI" },
  { symbol: "ICP", coingeckoId: "internet-computer", name: "Internet Computer" },
  { symbol: "SUSHI", coingeckoId: "sushi", name: "SushiSwap" },
  { symbol: "YFI", coingeckoId: "yearn-finance", name: "yearn.finance" },
  { symbol: "BAT", coingeckoId: "basic-attention-token", name: "Basic Attention Token" },
  { symbol: "ZRX", coingeckoId: "0x", name: "0x Protocol" },
  { symbol: "ANKR", coingeckoId: "ankr", name: "Ankr" },
  { symbol: "HNT", coingeckoId: "helium", name: "Helium" },
  { symbol: "CKB", coingeckoId: "nervos-network", name: "Nervos Network" },
];

export const DELTA_FUTURES_SYMBOLS = new Set(
  DELTA_FUTURES_ASSETS.map((a) => a.symbol)
);

export const DELTA_FUTURES_BY_SYMBOL = new Map(
  DELTA_FUTURES_ASSETS.map((a) => [a.symbol, a])
);

export function isDeltaFuturesSymbol(symbol: string): boolean {
  const s = symbol.toUpperCase();
  return DELTA_FUTURES_SYMBOLS.has(s) && !DELTA_EXCLUDED_SYMBOLS.has(s);
}

export function filterToDeltaFuturesMarkets<T extends { symbol: string }>(markets: T[]): T[] {
  return markets.filter((m) => isDeltaFuturesSymbol(m.symbol));
}
