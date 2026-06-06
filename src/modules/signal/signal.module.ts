import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SignalEntity } from '../../entities';
import { DataModule } from '../data/data.module';
import { IndicatorsModule } from '../indicators/indicators.module';
import { SignalEngineService } from './signal-engine.service';
import { SignalSchedulerService } from './signal-scheduler.service';
import { SignalsGateway } from './signals.gateway';

@Module({
  imports: [DataModule, IndicatorsModule, TypeOrmModule.forFeature([SignalEntity])],
  providers: [SignalEngineService, SignalSchedulerService, SignalsGateway],
  exports: [SignalEngineService, SignalSchedulerService, SignalsGateway],
})
export class SignalModule {}
