import { DynamicModule, Module } from '@nestjs/common';
import { isVercel } from '../../common/runtime';
import { SignalModule } from '../signal/signal.module';
import { BacktestModule } from '../backtest/backtest.module';
import { IndicatorsModule } from '../indicators/indicators.module';
import { SignalsController } from './signals.controller';
import { ChartAnalysisService } from './chart-analysis.service';
import { MarketLiveService } from './market-live.service';
import { TimeframeSignalService } from './timeframe-signal.service';

@Module({})
export class ApiModule {
  static register(opts?: { serverless?: boolean }): DynamicModule {
    const serverless = opts?.serverless ?? isVercel;
    const imports = [SignalModule.register(opts), IndicatorsModule];
    if (!serverless) {
      imports.push(BacktestModule);
    }
    return {
      module: ApiModule,
      imports,
      controllers: [SignalsController],
      providers: [ChartAnalysisService, MarketLiveService, TimeframeSignalService],
    };
  }
}
