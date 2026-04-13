import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    // Enable raw body parsing for Razorpay webhook signature verification
    rawBody: true,
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port') || 3001;
  const nodeEnv = configService.get<string>('app.nodeEnv');
  const frontendUrl = configService.get<string>('app.frontendUrl');
  const apiPrefix = configService.get<string>('app.apiPrefix');

  // ── Security ────────────────────────────────────────────────────────────
  app.use(helmet.default());
  app.use(compression());

  // ── CORS ────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: nodeEnv === 'production'
      ? [frontendUrl, /\.coverai\.in$/]
      : ['http://localhost:3000', 'http://localhost:3001', frontendUrl],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-razorpay-signature'],
    credentials: true,
  });

  // ── Global Prefix ────────────────────────────────────────────────────────
  app.setGlobalPrefix(apiPrefix, {
    exclude: ['health', 'health/ping'],
  });

  // ── Global Validation Pipe ───────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,             // Strip unknown properties
      forbidNonWhitelisted: false, // Don't throw on unknown, just strip
      transform: true,             // Auto-transform types (string → number)
      transformOptions: { enableImplicitConversion: true },
      stopAtFirstError: false,     // Collect all validation errors
    }),
  );

  // ── Class Serializer (for @Exclude decorators) ───────────────────────────
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector), {
      strategy: 'exposeAll',
      excludeExtraneousValues: false,
    }),
  );

  // ── Swagger API Docs ─────────────────────────────────────────────────────
  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('CoverAI API')
      .setDescription(
        'Insurance Aggregation Platform API — authentication, policy comparison, recommendations, payments.',
      )
      .setVersion('1.0.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
        'Bearer',
      )
      .addTag('Authentication', 'Register, login, JWT refresh, OAuth')
      .addTag('Users', 'Profile management, dashboard, KYC')
      .addTag('Policies', 'Catalog, filtering, comparison, quotes')
      .addTag('Payments', 'Razorpay orders, verification, webhooks')
      .addTag('Recommendations', 'AI-powered recommendations, insights')
      .addTag('Analytics', 'Platform metrics (Admin only)')
      .addTag('Health', 'Health checks')
      .addServer(`http://localhost:${port}`, 'Development')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
        docExpansion: 'none',
        filter: true,
        showRequestDuration: true,
      },
      customCss: `
        .swagger-ui .topbar { background: linear-gradient(135deg, #7c3aed, #2563eb); }
        .swagger-ui .topbar .download-url-wrapper { display: none; }
      `,
      customSiteTitle: 'CoverAI API Docs',
    });

    logger.log(`📚 Swagger docs: http://localhost:${port}/docs`);
  }

  // ── Start Server ─────────────────────────────────────────────────────────
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 CoverAI API running on http://localhost:${port}/${apiPrefix}`);
  logger.log(`🌍 Environment: ${nodeEnv}`);
  logger.log(`🔒 CORS origin: ${frontendUrl}`);
}

bootstrap().catch((err) => {
  new Logger('Bootstrap').error('Failed to start application', err);
  process.exit(1);
});
