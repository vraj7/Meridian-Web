import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import express, { type Express } from 'express';
import { AppModule } from './app.module';

let cachedServer: Express | null = null;

async function createApp(): Promise<Express> {
  const expressApp = express();
  const nest = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
    bufferLogs: true,
  });

  nest.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
  nest.enableCors();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Meridian Signals API')
    .setDescription('CoinDCX USDT futures trading signals')
    .setVersion('1.0')
    .addTag('signals')
    .build();
  const document = SwaggerModule.createDocument(nest, swaggerConfig);
  SwaggerModule.setup('api/docs', nest, document);

  await nest.init();
  return expressApp;
}

/** Vercel serverless entry — REST + static UI only (no cron/WebSocket). */
export default async function handler(req: express.Request, res: express.Response) {
  if (!cachedServer) {
    cachedServer = await createApp();
  }
  cachedServer(req, res);
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
