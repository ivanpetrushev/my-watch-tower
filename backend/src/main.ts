import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

// for proper JSON serialization of BigInt values
BigInt.prototype['toJSON'] = function () {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  return this.toString();
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('My Watch Tower API')
    .setDescription('Satellite tracker and predictor')
    .setVersion('1.0')
    .addTag('satellites')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, documentFactory, {
    useGlobalPrefix: true,
  });

  app.enableCors();

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
