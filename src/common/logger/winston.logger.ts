import * as winston from 'winston';

// CJS package — default import breaks at runtime with Nest/tsc
// eslint-disable-next-line @typescript-eslint/no-require-imports
const DailyRotateFile = require('winston-daily-rotate-file') as new (
  options: {
    dirname?: string;
    filename?: string;
    datePattern?: string;
    maxFiles?: string | number;
    level?: string;
  },
) => winston.transport;

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, context, stack }) => {
    const ctx = context ? `[${context}] ` : '';
    const err = stack ? `\n${stack}` : '';
    return `${timestamp} ${level.toUpperCase()} ${ctx}${message}${err}`;
  }),
);

export function createWinstonLogger() {
  return winston.createLogger({
    level: process.env.LOG_LEVEL ?? 'info',
    format: logFormat,
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(winston.format.colorize(), logFormat),
      }),
      new DailyRotateFile({
        dirname: 'logs',
        filename: 'app-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxFiles: '14d',
        level: 'info',
      }),
      new DailyRotateFile({
        dirname: 'logs',
        filename: 'error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxFiles: '30d',
        level: 'error',
      }),
    ],
  });
}

export const WINSTON_LOGGER = 'WINSTON_LOGGER';
