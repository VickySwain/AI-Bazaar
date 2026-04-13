import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import * as redisStore from 'cache-manager-redis-yet';

// Config
import {
  appConfig,
  dbConfig,
  redisConfig,
  jwtConfig,
  googleConfig,
  razorpayConfig,
  kafkaConfig,
  emailConfig,
  twilioConfig,
  mlConfig,
  throttleConfig,
} from './config/configuration';

// Modules
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PoliciesModule } from './policies/policies.module';
import { PaymentsModule } from './payments/payments.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { KafkaModule } from './common/kafka/kafka.module';
import { HealthModule } from './common/health/health.module';

// Entities
import { User } from './users/entities/user.entity';
import { UserProfile } from './users/entities/user-profile.entity';
import { Policy } from './policies/entities/policy.entity';
import { Insurer } from './policies/entities/insurer.entity';
import { Quote } from './policies/entities/quote.entity';
import { Purchase } from './policies/entities/purchase.entity';
import { Payment } from './payments/entities/payment.entity';
import { Recommendation } from './recommendations/entities/recommendation.entity';

// Guards, Filters, Interceptors
import { JwtAuthGuard } from './auth/guards/auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

// Seed
import { DatabaseSeedService } from './database/seed.service';

@Module({
  imports: [
    // ── Config ──────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig, dbConfig, redisConfig, jwtConfig, googleConfig,
        razorpayConfig, kafkaConfig, emailConfig, twilioConfig, mlConfig, throttleConfig,
      ],
      envFilePath: ['.env.local', '.env'],
    }),

    // ── Database ─────────────────────────────────────────────
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        username: config.get<string>('database.username'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.name'),
        synchronize: config.get<boolean>('database.synchronize'),
        logging: config.get<boolean>('database.logging'),
        entities: [User, UserProfile, Policy, Insurer, Quote, Purchase, Payment, Recommendation],
        migrations: [__dirname + '/database/migrations/*.{ts,js}'],
        autoLoadEntities: true,
        ssl: config.get<string>('app.nodeEnv') === 'production'
          ? { rejectUnauthorized: false }
          : false,
        extra: {
          max: 20,         // connection pool max
          min: 2,          // connection pool min
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        },
      }),
    }),

    // ── Redis Cache ───────────────────────────────────────────
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        store: redisStore.redisStore,
        socket: {
          host: config.get<string>('redis.host'),
          port: config.get<number>('redis.port'),
        },
        password: config.get<string>('redis.password') || undefined,
        ttl: config.get<number>('redis.ttl'),
      }),
    }),

    // ── Rate Limiting ─────────────────────────────────────────
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('throttle.ttl') * 1000,
            limit: config.get<number>('throttle.limit'),
          },
        ],
      }),
    }),

    // ── Scheduler ────────────────────────────────────────────
    ScheduleModule.forRoot(),

    // ── Seed TypeORM features ────────────────────────────────
    TypeOrmModule.forFeature([User, UserProfile, Policy, Insurer, Quote, Purchase, Payment]),

    // ── Feature Modules ───────────────────────────────────────
    KafkaModule,
    AuthModule,
    UsersModule,
    PoliciesModule,
    PaymentsModule,
    RecommendationsModule,
    NotificationsModule,
    AnalyticsModule,
    HealthModule,
  ],
  providers: [
    // Global rate limit guard
    { provide: APP_GUARD, useClass: ThrottlerGuard },

    // Global JWT guard (bypassed by @Public())
    { provide: APP_GUARD, useClass: JwtAuthGuard },

    // Global roles guard
    { provide: APP_GUARD, useClass: RolesGuard },

    // Global exception filter
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },

    // Global interceptors
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },

    // Database seeder
    DatabaseSeedService,
  ],
})
export class AppModule {}
