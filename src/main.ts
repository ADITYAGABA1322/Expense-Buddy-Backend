import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });
  
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    // origin: ['https://my-domain.com'], // Specify allowed origins
    origin: '*',
    credentials: true, // Include credentials in CORS requests
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });
  
  app.setGlobalPrefix('api');
  
  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');

  
  logger.log(`🚀 ExpenseBuddy API Server running on http://localhost:${port}`);
  logger.log(`📊 Health Check: http://localhost:${port}/api/health`);
  logger.log(`📖 API Documentation: http://localhost:${port}/api`);
}
bootstrap();