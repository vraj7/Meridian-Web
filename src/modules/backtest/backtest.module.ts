import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BacktestResultEntity } from '../../entities';
import { BacktestService } from './backtest.service';

@Module({
  imports: [TypeOrmModule.forFeature([BacktestResultEntity])],
  providers: [BacktestService],
  exports: [BacktestService],
})
export class BacktestModule {}
