import { DynamicModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SignalEntity } from '../../entities';
import { isVercel } from '../../common/runtime';
import { DataModule } from '../data/data.module';
import { IndicatorsModule } from '../indicators/indicators.module';
import { SignalEngineService } from './signal-engine.service';
import { SignalSchedulerService } from './signal-scheduler.service';
import { SignalsGateway } from './signals.gateway';
import { NoOpSignalsGateway } from './signals.gateway.noop';

@Module({})
export class SignalModule {
  static register(opts?: { serverless?: boolean }): DynamicModule {
    const serverless = opts?.serverless ?? isVercel;
    const imports = [DataModule.register(opts), IndicatorsModule];
    if (!serverless) {
      imports.push(TypeOrmModule.forFeature([SignalEntity]));
    }

    return {
      module: SignalModule,
      imports,
      providers: [
        SignalEngineService,
        SignalSchedulerService,
        serverless
          ? { provide: SignalsGateway, useClass: NoOpSignalsGateway }
          : SignalsGateway,
      ],
      exports: [
        DataModule,
        SignalEngineService,
        SignalSchedulerService,
        SignalsGateway,
      ],
    };
  }
}
