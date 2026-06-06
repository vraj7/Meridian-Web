import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databasePath: process.env.DATABASE_PATH ?? './data/signals.db',
  signalCron: process.env.SIGNAL_CRON ?? '*/5 * * * *',
  coinglassApiKey: process.env.COINGLASS_API_KEY ?? '',
  cryptopanicApiKey: process.env.CRYPTOPANIC_API_KEY ?? '',
  redisUrl: process.env.REDIS_URL ?? '',
  cacheTtlMs: 60_000,
  scanPairCount: parseInt(process.env.SCAN_PAIR_COUNT ?? '50', 10),
  scanPairCountMin: parseInt(process.env.SCAN_PAIR_COUNT_MIN ?? '5', 10),
  scanPairCountMax: parseInt(process.env.SCAN_PAIR_COUNT_MAX ?? '150', 10),
  signalConfidenceThreshold: 70,
  weakSignalMin: 50,
}));
