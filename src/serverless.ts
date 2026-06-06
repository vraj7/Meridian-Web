import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import express, { type Express, type Request, type Response } from 'express';
import { AppServerlessModule } from './app.serverless.module';

let cachedServer: Express | null = null;
let bootstrapError: unknown = null;

async function createApp(): Promise<Express> {
  const expressApp = express();
  const nest = await NestFactory.create(AppServerlessModule, new ExpressAdapter(expressApp), {
    bufferLogs: true,
  });

  nest.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
  nest.enableCors();

  await nest.init();
  return expressApp;
}

function waitForResponse(app: Express, req: Request, res: Response): Promise<void> {
  return new Promise((resolve, reject) => {
    res.on('finish', resolve);
    res.on('close', resolve);
    res.on('error', reject);
    app(req, res);
  });
}

/** Vercel serverless entry — REST + static UI only (no cron/WebSocket/SQLite). */
export default async function handler(req: Request, res: Response): Promise<void> {
  try {
    if (bootstrapError) {
      res.status(500).json({
        error: 'Server failed to start',
        message: bootstrapError instanceof Error ? bootstrapError.message : String(bootstrapError),
      });
      return;
    }

    if (!cachedServer) {
      cachedServer = await createApp();
    }

    await waitForResponse(cachedServer, req, res);
  } catch (err) {
    if (!cachedServer) bootstrapError = err;
    console.error('Serverless handler error:', err);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Internal server error',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

/** Optional local smoke test: node dist/serverless.js */
if (require.main === module) {
  void (async () => {
    const app = await createApp();
    const port = parseInt(process.env.PORT ?? '3000', 10);
    app.listen(port, () => {
      console.log(`Meridian (serverless mode) http://localhost:${port}`);
    });
  })();
}
