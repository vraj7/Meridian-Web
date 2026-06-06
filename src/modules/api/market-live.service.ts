import { Injectable } from '@nestjs/common';
import { CHART_INTERVAL_CONFIG, type ChartInterval } from '../../common/chart-intervals';
import { CoinDcxService } from '../data/coindcx.service';
import { parseCoindcxWsPayload } from './coindcx-ws.util';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ioClient = require('socket.io-client') as {
  connect: (url: string, opts?: Record<string, unknown>) => {
    on: (event: string, cb: (...args: unknown[]) => void) => void;
    emit: (event: string, data?: unknown) => void;
    disconnect: () => void;
  };
};

@Injectable()
export class MarketLiveService {
  subscribe(
    pairInput: string,
    interval: ChartInterval,
    onPrice: (price: number, ts: number) => void,
    onCandle: (bars: unknown[]) => void,
    onStatus: (connected: boolean) => void,
  ): () => void {
    const pair = this.coindcx.normalizePair(pairInput);
    const wsSuffix = CHART_INTERVAL_CONFIG[interval].wsSuffix;
    const candleCh = `${pair}_${wsSuffix}-futures`;
    const priceCh = `${pair}@prices-futures`;

    const socket = ioClient.connect('https://stream.coindcx.com', {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 2000,
    });

    let pingTimer: ReturnType<typeof setInterval> | null = null;

    const cleanup = () => {
      if (pingTimer) clearInterval(pingTimer);
      socket.emit('leave', { channelName: candleCh });
      socket.emit('leave', { channelName: priceCh });
      socket.disconnect();
    };

    socket.on('connect', () => {
      onStatus(true);
      socket.emit('join', { channelName: candleCh });
      socket.emit('join', { channelName: priceCh });
      pingTimer = setInterval(() => {
        try {
          socket.emit('ping', { data: 'ping' });
        } catch {
          /* ignore */
        }
      }, 25_000);
    });

    socket.on('disconnect', () => onStatus(false));

    socket.on('price-change', (msg: unknown) => {
      const data = parseCoindcxWsPayload(msg) as { p?: string; T?: number } | null;
      if (!data?.p) return;
      const price = parseFloat(data.p);
      if (Number.isFinite(price)) onPrice(price, Number(data.T) || Date.now());
    });

    socket.on('candlestick', (msg: unknown) => {
      const payload = parseCoindcxWsPayload(msg) as { data?: unknown[] } | null;
      if (payload?.data?.length) onCandle(payload.data);
    });

    socket.on('connect_error', () => onStatus(false));

    return cleanup;
  }

  constructor(private readonly coindcx: CoinDcxService) {}
}
