import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { ServeStaticModule } from '@nestjs/serve-static';
import { redisStore } from 'cache-manager-redis-yet';
import * as path from 'path';
import appConfig from './config/app.config';
import { ApiModule } from './modules/api/api.module';
import { SignalEntity, BacktestResultEntity, OiHistoryEntity } from './entities';
import { LoggerModule } from './common/logger/logger.module';
import * as fs from 'fs';

/** Full app — SQLite, cron, WebSockets (local / Render). */
@Module({
  imports: [
    LoggerModule,
    ConfigModule.forRoot({ isGlobal: true, load: [appConfig] }),
    ScheduleModule.forRoot(),
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const ttl = config.get('app.cacheTtlMs', 60_000);
        const redisUrl = config.get<string>('app.redisUrl', '')?.trim();
        if (!redisUrl) {
          return { ttl };
        }
        try {
          const store = await redisStore({
            url: redisUrl,
            socket: { connectTimeout: 2000, reconnectStrategy: () => false },
          });
          await store.client.ping();
          return { store, ttl };
        } catch {
          return { ttl };
        }
      },
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const dbPath = config.get<string>('app.databasePath', './data/signals.db');
        const dir = path.dirname(dbPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        return {
          type: 'sqlite',
          database: dbPath,
          entities: [SignalEntity, BacktestResultEntity, OiHistoryEntity],
          synchronize: true,
        };
      },
    }),
    ApiModule.register(),
    ServeStaticModule.forRoot({
      rootPath: path.join(__dirname, 'public'),
      exclude: ['/health', '/signals/(.*)', '/market/(.*)', '/backtest/(.*)', '/settings/(.*)', '/api/docs/(.*)'],
    }),
  ],
})
export class AppModule {}
