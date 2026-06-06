import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { AppLogger } from '../../common/logger/app.logger';
import type { TradingSignalDto } from '../../common/types';

@WebSocketGateway({
  namespace: '/ws/signals',
  cors: { origin: '*' },
})
export class SignalsGateway implements OnGatewayInit {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly logger: AppLogger) {}

  afterInit(): void {
    this.logger.log('WebSocket gateway /ws/signals ready', 'SignalsGateway');
  }

  broadcastSignals(signals: TradingSignalDto[]): void {
    const actionable = signals.filter((s) => s.direction !== 'NEUTRAL' && !s.weakSignal);
    this.server?.emit('signals', {
      type: 'signals_update',
      count: signals.length,
      actionable: actionable.length,
      signals: actionable,
      timestamp: new Date().toISOString(),
    });
  }

  broadcastSingle(signal: TradingSignalDto): void {
    this.server?.emit('signal', { type: 'signal', signal, timestamp: new Date().toISOString() });
  }
}
