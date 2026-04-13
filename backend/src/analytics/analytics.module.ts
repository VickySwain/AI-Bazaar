import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { Purchase } from '../policies/entities/purchase.entity';
import { Payment } from '../payments/entities/payment.entity';
import { User } from '../users/entities/user.entity';
import { Quote } from '../policies/entities/quote.entity';
import { Policy } from '../policies/entities/policy.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Purchase, Payment, User, Quote, Policy])],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
