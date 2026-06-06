import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { ServeStaticModule } from '@nestjs/serve-static';
import * as path from 'path';
import appConfig from './config/app.config';
import { IndicatorsModule } from './modules/indicators/indicators.module';
import { ApiModule } from './modules/api/api.module';
import { LoggerModule } from './common/logger/logger.module';

/** Vercel serverless — no native sqlite3, cron, or WebSockets. */
@Module({
  imports: [
    LoggerModule,
    ConfigModule.forRoot({ isGlobal: true, load: [appConfig] }),
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        ttl: config.get('app.cacheTtlMs', 60_000),
      }),
    }),
    IndicatorsModule,
    ApiModule.register({ serverless: true }),
    ServeStaticModule.forRoot({
      rootPath: path.join(__dirname, 'public'),
      exclude: ['/health', '/signals/(.*)', '/market/(.*)', '/backtest/(.*)', '/settings/(.*)', '/api/docs/(.*)'],
    }),
  ],
})
export class AppServerlessModule {}
