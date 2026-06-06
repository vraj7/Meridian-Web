import { Inject, Injectable, LoggerService } from '@nestjs/common';
import type winston from 'winston';
import { WINSTON_LOGGER } from '../logger/winston.logger';

@Injectable()
export class AppLogger implements LoggerService {
  constructor(@Inject(WINSTON_LOGGER) private readonly logger: winston.Logger) {}

  log(message: string, context?: string) {
    this.logger.info(message, { context });
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, { context, stack: trace });
  }

  warn(message: string, context?: string) {
    this.logger.warn(message, { context });
  }

  debug(message: string, context?: string) {
    this.logger.debug(message, { context });
  }

  verbose(message: string, context?: string) {
    this.logger.verbose(message, { context });
  }
}
