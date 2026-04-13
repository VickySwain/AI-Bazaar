import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';
import { Recommendation } from './entities/recommendation.entity';
import { Policy } from '../policies/entities/policy.entity';
import { Purchase } from '../policies/entities/purchase.entity';
import { KafkaModule } from '../common/kafka/kafka.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Recommendation, Policy, Purchase]),
    HttpModule,
    KafkaModule,
  ],
  controllers: [RecommendationsController],
  providers: [RecommendationsService],
  exports: [RecommendationsService],
})
export class RecommendationsModule {}
