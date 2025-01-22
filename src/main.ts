import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  await app.listen(process.env.PORT);
  // const port = process.env.PORT || 8080;
  // await app.listen(port, '0.0.0.0');
}
bootstrap();
