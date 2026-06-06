# Meridian Signals

Single **NestJS** application — **CoinDCX USDT futures** signals (configurable top-N by 24h volume), REST API, WebSocket, backtesting, and built-in dashboard UI.

## Quick start

```bash
cp .env.example .env
npm install
npm run start:dev
```

| URL | Description |
|-----|-------------|
| http://localhost:3000 | Signals dashboard (UI) |
| http://localhost:3000/api/docs | Swagger API docs |
| ws://localhost:3000/ws/signals | Live signal WebSocket |

## Scripts

```bash
npm run start:dev   # development (watch)
npm run build       # compile
npm run start:prod  # production
```

## API

- `GET /health` — health check
- `GET /settings/scan` — scan pair count (default from `SCAN_PAIR_COUNT`)
- `PATCH /settings/scan?count=50` — set how many pairs to scan
- `GET /signals?pair=B-BTC_USDT` — latest signal for one pair
- `GET /signals/top100` — all cached signals from last scan
- `GET /signals/refresh?count=50` — trigger rescan (optional count)
- `GET /backtest/:pair?days=180` — run backtest (pair: `BTC`, `B-BTC_USDT`, etc.)

## Environment

See `.env.example`. Key: `SCAN_PAIR_COUNT` (default 50). Optional: `COINGLASS_API_KEY`, `CRYPTOPANIC_API_KEY`, `REDIS_URL`.

## Project layout

```
src/
├── modules/data/       # CoinDCX futures, OI proxy, sentiment
├── modules/indicators/ # EMA, RSI, MACD, ADX, scoring
├── modules/signal/     # Ensemble engine, cron, WebSocket
├── modules/backtest/   # Historical simulation
└── modules/api/        # REST controller
public/index.html       # Dashboard UI
```

**Disclaimer:** Research and education only — not financial advice.
