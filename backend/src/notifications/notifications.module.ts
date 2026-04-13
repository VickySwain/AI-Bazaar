import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { PaymentEventsConsumer } from './consumers/payment-events.consumer';
import { User } from '../users/entities/user.entity';
import { Purchase } from '../policies/entities/purchase.entity';
import { Payment } from '../payments/entities/payment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Purchase, Payment])],
  providers: [NotificationsService, PaymentEventsConsumer],
  exports: [NotificationsService],
})
export class NotificationsModule {}
