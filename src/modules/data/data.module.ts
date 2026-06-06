import { DynamicModule, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OiHistoryEntity } from '../../entities';
import { isVercel } from '../../common/runtime';
import { CoinDcxService } from './coindcx.service';
import { CoinglassService } from './coinglass.service';
import { CryptoPanicService } from './cryptopanic.service';
import { MarketContextService } from './market-context.service';
import { OiHistoryService } from './oi-history.service';
import { DataAggregatorService } from './data-aggregator.service';
import { RateLimiterService } from './rate-limiter.service';
import { ScanSettingsService } from './scan-settings.service';

const providers = [
  RateLimiterService,
  ScanSettingsService,
  CoinDcxService,
  CoinglassService,
  CryptoPanicService,
  MarketContextService,
  OiHistoryService,
  DataAggregatorService,
];

const exportsList = [
  ScanSettingsService,
  CoinDcxService,
  CoinglassService,
  CryptoPanicService,
  MarketContextService,
  OiHistoryService,
  DataAggregatorService,
];

@Module({})
export class DataModule {
  static register(opts?: { serverless?: boolean }): DynamicModule {
    const serverless = opts?.serverless ?? isVercel;
    const imports = [HttpModule.register({ timeout: 20_000 })];
    if (!serverless) {
      imports.push(TypeOrmModule.forFeature([OiHistoryEntity]));
    }
    return { module: DataModule, imports, providers, exports: exportsList };
  }
}
