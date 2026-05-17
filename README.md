# CryptoTerminal AI

Professional-grade **frontend-only** crypto intelligence terminal for top-50 market cap assets. All prices and signals are **USD-denominated** (e.g. BTC/USD). Spot & futures analysis, multi-indicator confirmation engine, sentiment, and charts — using **only free public APIs**.

> **Disclaimer:** This tool is for educational purposes only and not financial advice. Cryptocurrency trading involves substantial risk. Signals are probabilistic and do not guarantee profits.

## Features

- **Dashboard** — Live prices, BTC dominance, Fear & Greed, spot/futures signals, news
- **Spot & Futures signals** — BUY/SELL/WAIT, STRONG LONG/SHORT with confidence %
- **Coin detail** — TradingView Lightweight Charts, indicators, entry/SL/TP zones
- **AI Insights** — Market commentary and strategy notes
- **News & Sentiment** — Reddit + keyword NLP + Fear & Greed
- **Watchlist** — Persistent local storage
- **Heatmap & Trending** — Top 50 performance views
- **Settings** — Confidence threshold, demo mode, notifications

### Engines

- RSI, MACD, EMA/SMA, Bollinger, ATR, VWAP, Stochastic RSI
- Support/resistance, Fibonacci, candlestick patterns
- Multi-confirmation weighted scoring + risk filtering
- Futures: funding rate, open interest, squeeze hints

### Indian stock market (NSE)

- **Equities**: NIFTY 50 + indices via Yahoo Finance (`.NS` / `^NSEI`) — INR
- **Futures**: Index F&O bias from PCR, max pain, OI (NSE + technicals)
- **Options**: NSE option chain (free API + CORS proxy fallback) — CE/PE signals
- Pages: `/india`, `/india/futures`, `/india/options`, `/india/stock/[symbol]`

### USD pairs (crypto)

- Market data: CoinGecko `vs_currency=usd`
- Exchange candles/futures: tries `SYMBOLUSD` then `SYMBOLUSDT` (USD-pegged) per venue
- CryptoCompare: `tsym=USD`
- UI labels: `BTC/USD`, prices shown as `$…`

### Free APIs (with fallback rotation)

CoinGecko · Binance · Bybit · CoinCap · CoinPaprika · CryptoCompare · Alternative.me Fear & Greed · Reddit · (+ demo mode offline)

## Tech Stack

- Next.js 15 (App Router) · TypeScript · Tailwind CSS 4
- Zustand · TanStack Query · Axios · Framer Motion
- TradingView Lightweight Charts · IndexedDB/localStorage cache
- PWA-ready · WebSocket live prices (Binance)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build for production

```bash
npm run build
npm start
```

## Deploy to Vercel

1. Push this repo to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Framework preset: **Next.js**
4. Deploy — no environment variables required

Optional: enable **Demo Mode** in Settings if APIs rate-limit during development.

## Project Structure

```
src/
  app/           # Pages (App Router)
  components/    # UI, charts, layout
  config/        # API providers, constants
  data/          # Demo/mock data
  engines/       # Indicators, signals, prediction, risk
  hooks/         # React Query hooks
  lib/           # API client, cache, websocket, utils
  services/      # Market, candles, futures, sentiment APIs
  stores/        # Zustand (settings, watchlist, portfolio)
  types/
```

## License

MIT — use at your own risk.
