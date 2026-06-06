import { Module } from '@nestjs/common';
import { SignalModule } from '../signal/signal.module';
import { BacktestModule } from '../backtest/backtest.module';
import { DataModule } from '../data/data.module';
import { IndicatorsModule } from '../indicators/indicators.module';
import { SignalsController } from './signals.controller';
import { ChartAnalysisService } from './chart-analysis.service';
import { MarketLiveService } from './market-live.service';
import { TimeframeSignalService } from './timeframe-signal.service';

@Module({
  imports: [SignalModule, BacktestModule, DataModule, IndicatorsModule],
  controllers: [SignalsController],
  providers: [ChartAnalysisService, MarketLiveService, TimeframeSignalService],
})
export class ApiModule {}
