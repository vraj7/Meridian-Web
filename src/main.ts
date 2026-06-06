import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AppLogger } from './common/logger/app.logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = app.get(AppLogger);
  app.useLogger(logger);

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
  app.enableCors();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Meridian Signals API')
    .setDescription('CoinDCX USDT futures trading signals — configurable top-N scan by volume')
    .setVersion('1.0')
    .addTag('signals')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const config = app.get(ConfigService);
  const port = config.get<number>('app.port', 3000);
  await app.listen(port);
  logger.log(`Meridian Signals listening on http://localhost:${port}`, 'Bootstrap');
  logger.log(`Dashboard: http://localhost:${port}`, 'Bootstrap');
  logger.log(`Swagger: http://localhost:${port}/api/docs`, 'Bootstrap');
  logger.log(`WebSocket: ws://localhost:${port}/ws/signals`, 'Bootstrap');
}

bootstrap();
