import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BacktestResultEntity } from '../../entities';
import { DataModule } from '../data/data.module';
import { IndicatorsModule } from '../indicators/indicators.module';
import { SignalModule } from '../signal/signal.module';
import { BacktestService } from './backtest.service';

@Module({
  imports: [
    DataModule,
    IndicatorsModule,
    SignalModule,
    TypeOrmModule.forFeature([BacktestResultEntity]),
  ],
  providers: [BacktestService],
  exports: [BacktestService],
})
export class BacktestModule {}
