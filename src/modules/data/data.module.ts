import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OiHistoryEntity } from '../../entities';
import { CoinDcxService } from './coindcx.service';
import { CoinglassService } from './coinglass.service';
import { CryptoPanicService } from './cryptopanic.service';
import { MarketContextService } from './market-context.service';
import { OiHistoryService } from './oi-history.service';
import { DataAggregatorService } from './data-aggregator.service';
import { RateLimiterService } from './rate-limiter.service';
import { ScanSettingsService } from './scan-settings.service';

@Module({
  imports: [HttpModule.register({ timeout: 20_000 }), TypeOrmModule.forFeature([OiHistoryEntity])],
  providers: [
    RateLimiterService,
    ScanSettingsService,
    CoinDcxService,
    CoinglassService,
    CryptoPanicService,
    MarketContextService,
    OiHistoryService,
    DataAggregatorService,
  ],
  exports: [
    ScanSettingsService,
    CoinDcxService,
    CoinglassService,
    CryptoPanicService,
    MarketContextService,
    OiHistoryService,
    DataAggregatorService,
  ],
})
export class DataModule {}
