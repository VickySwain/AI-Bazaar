import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { NotificationsService } from '../notifications.service';
import { User } from '../../users/entities/user.entity';
import { Purchase } from '../../policies/entities/purchase.entity';
import { Payment } from '../../payments/entities/payment.entity';

@Injectable()
export class PaymentEventsConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PaymentEventsConsumer.name);
  private consumer: Consumer;
  private kafka: Kafka;

  constructor(
    private configService: ConfigService,
    private notificationsService: NotificationsService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Purchase)
    private purchaseRepository: Repository<Purchase>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
  ) {
    this.kafka = new Kafka({
      clientId: this.configService.get<string>('kafka.clientId'),
      brokers: this.configService.get<string[]>('kafka.brokers'),
    });

    this.consumer = this.kafka.consumer({
      groupId: `${this.configService.get<string>('kafka.groupId')}-notifications`,
    });
  }

  async onModuleInit() {
    try {
      await this.consumer.connect();
      await this.consumer.subscribe({
        topics: ['payment.captured', 'policy.activated'],
        fromBeginning: false,
      });

      await this.consumer.run({
        eachMessage: async (payload: EachMessagePayload) => {
          await this.handleMessage(payload);
        },
      });

      this.logger.log('Payment events consumer connected and subscribed');
    } catch (err) {
      this.logger.warn(`Kafka consumer failed to connect (non-fatal): ${err.message}`);
    }
  }

  async onModuleDestroy() {
    try {
      await this.consumer.disconnect();
    } catch (err) {
      this.logger.warn(`Error disconnecting consumer: ${err.message}`);
    }
  }

  private async handleMessage({ topic, message }: EachMessagePayload) {
    const value = message.value?.toString();
    if (!value) return;

    let payload: any;
    try {
      payload = JSON.parse(value);
    } catch {
      this.logger.warn(`Failed to parse message on topic ${topic}`);
      return;
    }

    this.logger.log(`Processing event: ${topic} | paymentId: ${payload.paymentId}`);

    switch (topic) {
      case 'payment.captured':
        await this.handlePaymentCaptured(payload);
        break;
      case 'policy.activated':
        await this.handlePolicyActivated(payload);
        break;
      default:
        this.logger.debug(`No handler for topic: ${topic}`);
    }
  }

  private async handlePaymentCaptured(payload: {
    paymentId: string;
    userId: string;
    amount: number;
    purchaseId: string;
  }) {
    try {
      const [user, payment] = await Promise.all([
        this.userRepository.findOne({ where: { id: payload.userId } }),
        this.paymentRepository.findOne({ where: { id: payload.paymentId } }),
      ]);

      if (!user || !payment) return;

      // Get purchase + policy details
      const purchase = await this.purchaseRepository.findOne({
        where: { id: payload.purchaseId },
        relations: ['policy'],
      });

      await this.notificationsService.sendPaymentReceipt(user.email, user.fullName, {
        paymentId: payment.razorpayPaymentId || payment.id,
        amount: payment.amount,
        policyName: purchase?.policy?.name || 'Insurance Policy',
        paidAt: payment.paidAt || new Date(),
      });

      this.logger.log(`Payment receipt sent to ${user.email}`);
    } catch (err) {
      this.logger.error(`Failed to handle payment.captured: ${err.message}`);
    }
  }

  private async handlePolicyActivated(payload: {
    purchaseId: string;
    userId: string;
  }) {
    try {
      const [user, purchase] = await Promise.all([
        this.userRepository.findOne({ where: { id: payload.userId } }),
        this.purchaseRepository.findOne({
          where: { id: payload.purchaseId },
          relations: ['policy'],
        }),
      ]);

      if (!user || !purchase) return;

      await this.notificationsService.sendPolicyActivated(user.email, user.fullName, {
        policyNumber: purchase.policyNumber,
        policyName: purchase.policy?.name,
        premiumPaid: purchase.premiumPaid,
        expiresAt: purchase.expiresAt,
      });

      this.logger.log(`Policy activation email sent to ${user.email}`);
    } catch (err) {
      this.logger.error(`Failed to handle policy.activated: ${err.message}`);
    }
  }
}
