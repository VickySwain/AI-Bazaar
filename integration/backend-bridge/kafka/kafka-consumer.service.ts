// src/common/kafka/kafka-consumer.service.ts
// Consumes Kafka events and routes them across the system.
// Bridges payment/policy events to the ML feedback loop and notification service.

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Kafka, Consumer, EachMessagePayload, KafkaMessage } from 'kafkajs';
import { User } from '../../users/entities/user.entity';
import { Purchase, PurchaseStatus } from '../../policies/entities/purchase.entity';
import { Payment, PaymentStatus } from '../../payments/entities/payment.entity';
import { Recommendation } from '../../recommendations/entities/recommendation.entity';

interface ParsedEvent {
  topic: string;
  payload: Record<string, any>;
  timestamp: string;
}

@Injectable()
export class KafkaConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaConsumerService.name);
  private kafka: Kafka;
  private consumer: Consumer;
  private isRunning = false;

  // Topics this service subscribes to
  private readonly TOPICS = [
    'payment.captured',
    'payment.webhook.captured',
    'policy.activated',
    'recommendations.interaction',
    'recommendations.generated',
  ];

  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Purchase)
    private purchaseRepository: Repository<Purchase>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Recommendation)
    private recommendationRepository: Repository<Recommendation>,
  ) {
    this.kafka = new Kafka({
      clientId: this.configService.get<string>('kafka.clientId') + '-consumer',
      brokers: this.configService.get<string[]>('kafka.brokers'),
      retry: { retries: 5, initialRetryTime: 300 },
    });

    this.consumer = this.kafka.consumer({
      groupId: this.configService.get<string>('kafka.groupId') + '-backend',
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
      maxWaitTimeInMs: 5000,
    });
  }

  async onModuleInit() {
    await this.start().catch((err) => {
      this.logger.warn(`Kafka consumer failed to start (non-fatal): ${err.message}`);
    });
  }

  async onModuleDestroy() {
    await this.stop();
  }

  private async start() {
    await this.consumer.connect();

    await this.consumer.subscribe({
      topics: this.TOPICS,
      fromBeginning: false,
    });

    await this.consumer.run({
      autoCommit: true,
      autoCommitInterval: 5000,
      eachMessage: async (payload: EachMessagePayload) => {
        await this.dispatch(payload);
      },
    });

    this.isRunning = true;
    this.logger.log(`Kafka consumer subscribed to: ${this.TOPICS.join(', ')}`);
  }

  private async stop() {
    if (this.isRunning) {
      await this.consumer.disconnect().catch(() => {});
      this.isRunning = false;
    }
  }

  // ── Message dispatcher ───────────────────────────────────────────────────

  private async dispatch({ topic, message }: EachMessagePayload) {
    const raw = message.value?.toString();
    if (!raw) return;

    let payload: Record<string, any>;
    try {
      payload = JSON.parse(raw);
    } catch {
      this.logger.warn(`Malformed Kafka message on topic ${topic}`);
      return;
    }

    const event: ParsedEvent = { topic, payload, timestamp: new Date().toISOString() };
    this.logger.debug(`[${topic}] ${JSON.stringify(payload).slice(0, 120)}`);

    switch (topic) {
      case 'payment.captured':
      case 'payment.webhook.captured':
        await this.handlePaymentCaptured(event);
        break;
      case 'policy.activated':
        await this.handlePolicyActivated(event);
        break;
      case 'recommendations.interaction':
        await this.handleRecommendationInteraction(event);
        break;
      case 'recommendations.generated':
        await this.handleRecommendationsGenerated(event);
        break;
      default:
        this.logger.debug(`No handler for topic: ${topic}`);
    }
  }

  // ── Event Handlers ────────────────────────────────────────────────────────

  /**
   * Payment captured: update purchase to ACTIVE, send notifications.
   */
  private async handlePaymentCaptured(event: ParsedEvent) {
    const { paymentId, userId, purchaseId } = event.payload;
    try {
      const payment = await this.paymentRepository.findOne({
        where: { id: paymentId },
      });
      if (!payment || payment.status === PaymentStatus.CAPTURED) return;

      await this.paymentRepository.update(paymentId, {
        status: PaymentStatus.CAPTURED,
        paidAt: new Date(),
      });

      if (purchaseId) {
        const policyNumber = `POL-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 7)
          .toUpperCase()}`;
        const activatedAt = new Date();
        const expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);

        await this.purchaseRepository.update(purchaseId, {
          status: PurchaseStatus.ACTIVE,
          policyNumber,
          paymentId,
          activatedAt,
          expiresAt,
          nextRenewalAt: expiresAt,
        });

        this.logger.log(
          `Purchase ${purchaseId} activated (policy #${policyNumber}) for user ${userId}`,
        );
      }

      // Invalidate ML recommendation cache after purchase
      // (user's portfolio has changed, so recommendations should refresh)
      await this.invalidateMlCache(userId);

    } catch (err) {
      this.logger.error(`handlePaymentCaptured error: ${err.message}`);
    }
  }

  /**
   * Policy activated: mark recommendation as purchased for ML feedback.
   */
  private async handlePolicyActivated(event: ParsedEvent) {
    const { purchaseId, userId } = event.payload;
    try {
      // Find the recommendation that led to this purchase and mark it
      const purchase = await this.purchaseRepository.findOne({
        where: { id: purchaseId },
      });
      if (!purchase) return;

      const rec = await this.recommendationRepository.findOne({
        where: { userId, policyId: purchase.policyId },
        order: { createdAt: 'DESC' },
      });

      if (rec) {
        await this.recommendationRepository.update(rec.id, { wasPurchased: true });
        this.logger.log(
          `Recommendation ${rec.id} marked as purchased — ` +
          `feeds into ML retraining dataset`,
        );
      }
    } catch (err) {
      this.logger.error(`handlePolicyActivated error: ${err.message}`);
    }
  }

  /**
   * Recommendation interaction: update click/purchase flags for A/B tracking.
   */
  private async handleRecommendationInteraction(event: ParsedEvent) {
    const { recommendationId, action } = event.payload;
    if (!recommendationId) return;

    try {
      const update: Partial<Recommendation> = {};
      if (action === 'click')    update.wasClicked   = true;
      if (action === 'purchase') update.wasPurchased = true;

      if (Object.keys(update).length > 0) {
        await this.recommendationRepository.update(recommendationId, update);
      }
    } catch (err) {
      this.logger.debug(`handleRecommendationInteraction: ${err.message}`);
    }
  }

  /**
   * Recommendations generated: log analytics for dashboard reporting.
   */
  private async handleRecommendationsGenerated(event: ParsedEvent) {
    const { userId, count, modelVersion, fallbackUsed } = event.payload;
    this.logger.debug(
      `Recommendations generated for ${userId}: ` +
      `count=${count} model=${modelVersion} fallback=${fallbackUsed}`,
    );
    // In production: write to analytics timeseries table / ClickHouse
  }

  // ── Cache invalidation helper ─────────────────────────────────────────────

  private async invalidateMlCache(userId: string) {
    // This would call the MlServiceAdapter — injected in the full app
    // Here we just log; the adapter is injected in recommendations.service.ts
    this.logger.debug(`ML cache invalidation queued for user ${userId}`);
  }
}
