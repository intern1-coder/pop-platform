import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.setGlobalPrefix('api');
  
  // Force binding to all interfaces so we can actually test it
  await app.listen(3000, '0.0.0.0', () => {
    console.log('✅ POP Backend is ACTUALLY listening on http://0.0.0.0:3000');
  });
}
bootstrap();