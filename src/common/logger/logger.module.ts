import { Global, Module } from '@nestjs/common';
import * as fs from 'fs';
import { createWinstonLogger, WINSTON_LOGGER } from './winston.logger';
import { AppLogger } from './app.logger';

@Global()
@Module({
  providers: [
    {
      provide: WINSTON_LOGGER,
      useFactory: () => {
        if (!fs.existsSync('logs')) fs.mkdirSync('logs', { recursive: true });
        return createWinstonLogger();
      },
    },
    AppLogger,
  ],
  exports: [AppLogger],
})
export class LoggerModule {}
