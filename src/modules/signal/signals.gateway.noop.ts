import { Injectable } from '@nestjs/common';
import type { TradingSignalDto } from '../../common/types';

/** Serverless stub — WebSockets are not supported on Vercel. */
@Injectable()
export class NoOpSignalsGateway {
  broadcastSignals(_signals: TradingSignalDto[]): void {}
  broadcastSingle(_signal: TradingSignalDto): void {}
}
