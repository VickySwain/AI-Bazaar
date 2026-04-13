// src/recommendations/recommendations.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';
import { MlServiceAdapter } from './ml-service.adapter';
import { Recommendation } from './entities/recommendation.entity';
import { Policy } from '../policies/entities/policy.entity';
import { Purchase } from '../policies/entities/purchase.entity';
import { KafkaModule } from '../common/kafka/kafka.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Recommendation, Policy, Purchase]),
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        baseURL: config.get<string>('ml.serviceUrl') || 'http://localhost:8000',
        timeout: config.get<number>('ml.timeout') || 5000,
        headers: { 'Content-Type': 'application/json' },
        maxRedirects: 0,
      }),
    }),
    KafkaModule,
  ],
  controllers: [RecommendationsController],
  providers: [RecommendationsService, MlServiceAdapter],
  exports: [RecommendationsService, MlServiceAdapter],
})
export class RecommendationsModule {}
