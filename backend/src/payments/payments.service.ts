import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

const Razorpay = require('razorpay');

import { Payment, PaymentStatus } from './entities/payment.entity';
import { Purchase, PurchaseStatus } from '../policies/entities/purchase.entity';
import { Quote, QuoteStatus } from '../policies/entities/quote.entity';
import { User } from '../users/entities/user.entity';
import { CreateOrderDto, VerifyPaymentDto, RefundDto } from './dto/payment.dto';
import { KafkaProducerService } from '../common/kafka/kafka-producer.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private razorpay: any;

  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Purchase)
    private purchaseRepository: Repository<Purchase>,
    @InjectRepository(Quote)
    private quoteRepository: Repository<Quote>,
    private configService: ConfigService,
    private kafkaProducer: KafkaProducerService,
    private notificationsService: NotificationsService,
  ) {
    const keyId = this.configService.get<string>('razorpay.keyId');
    const keySecret = this.configService.get<string>('razorpay.keySecret');
    this.logger.log(`Razorpay init: keyId=${keyId ? 'SET' : 'MISSING'}, keySecret=${keySecret ? 'SET' : 'MISSING'}`);
    this.razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }

  async createOrder(user: User, dto: CreateOrderDto) {
    const quote = await this.quoteRepository.findOne({
      where: { id: dto.quoteId, userId: user.id },
      relations: ['policy', 'policy.insurer'],
    });

    if (!quote) throw new NotFoundException('Quote not found');

    if (quote.status !== QuoteStatus.ACTIVE) {
      throw new BadRequestException(`Quote is ${quote.status.toLowerCase()}, cannot create order`);
    }

    if (quote.expiresAt < new Date()) {
      await this.quoteRepository.update(quote.id, { status: QuoteStatus.EXPIRED });
      throw new BadRequestException('Quote has expired. Please generate a new quote.');
    }

    const idempotencyKey = `${user.id}:${dto.quoteId}`;

    const existing = await this.paymentRepository.findOne({
      where: { idempotencyKey },
    });

    if (existing && existing.status === PaymentStatus.CAPTURED) {
      throw new ConflictException('Payment already completed for this quote');
    }

    const amountInPaise = Math.round((quote.totalPremium || 0) * 100);
    this.logger.log(`Creating order: amount=${amountInPaise}, quoteId=${dto.quoteId}, premium=${quote.totalPremium}`);

    let razorpayOrder: any;
    try {
      razorpayOrder = await this.razorpay.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `receipt_${uuidv4().replace(/-/g, '').slice(0, 20)}`,
        notes: {
          userId: user.id,
          quoteId: quote.id,
          policyId: quote.policyId,
          policyName: quote.policy?.name,
        },
      });
    } catch (err) {
      this.logger.error(`Razorpay order creation failed: ${JSON.stringify(err)}`);
      throw new BadRequestException(`Payment gateway error: ${err?.error?.description || err?.message || 'Unknown error'}`);
    }

    const purchase = this.purchaseRepository.create({
      userId: user.id,
      policyId: quote.policyId,
      premiumPaid: quote.totalPremium,
      sumAssured: quote.policy?.sumAssured,
      status: PurchaseStatus.PENDING,
      insuredDetails: dto.insuredDetails,
      nomineeDetails: dto.nomineeDetails,
      metadata: { quoteId: quote.id },
    });
    const savedPurchase = await this.purchaseRepository.save(purchase);

    const payment = existing
      ? Object.assign(existing, {
          razorpayOrderId: razorpayOrder.id,
          status: PaymentStatus.CREATED,
        })
      : this.paymentRepository.create({
          userId: user.id,
          idempotencyKey,
          razorpayOrderId: razorpayOrder.id,
          amount: quote.totalPremium,
          currency: 'INR',
          status: PaymentStatus.CREATED,
          description: `Premium for ${quote.policy?.name}`,
          metadata: { quoteId: quote.id, purchaseId: savedPurchase.id },
        });

    const savedPayment = await this.paymentRepository.save(payment);

    await this.purchaseRepository.update(savedPurchase.id, { paymentId: savedPayment.id });

    return {
      orderId: razorpayOrder.id,
      amount: amountInPaise,
      currency: 'INR',
      keyId: this.configService.get<string>('razorpay.keyId'),
      paymentId: savedPayment.id,
      purchaseId: savedPurchase.id,
      policy: {
        name: quote.policy?.name,
        insurer: quote.policy?.insurer?.name,
      },
      prefill: {
        name: user.fullName,
        email: user.email,
        contact: user.phone,
      },
    };
  }

  async verifyPayment(user: User, dto: VerifyPaymentDto) {
    const payment = await this.paymentRepository.findOne({
      where: { razorpayOrderId: dto.razorpayOrderId, userId: user.id },
    });

    if (!payment) throw new NotFoundException('Payment record not found');

    const expectedSignature = crypto
      .createHmac('sha256', this.configService.get<string>('razorpay.keySecret'))
      .update(`${dto.razorpayOrderId}|${dto.razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== dto.razorpaySignature) {
      throw new UnauthorizedException('Payment signature verification failed');
    }

    await this.paymentRepository.update(payment.id, {
      razorpayPaymentId: dto.razorpayPaymentId,
      razorpaySignature: dto.razorpaySignature,
      status: PaymentStatus.CAPTURED,
      paidAt: new Date(),
    });

    const purchaseId = payment.metadata?.purchaseId;
    if (purchaseId) {
      const policyNumber = `POL-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
      const activatedAt = new Date();
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      await this.purchaseRepository.update(purchaseId, {
        status: PurchaseStatus.ACTIVE,
        policyNumber,
        paymentId: payment.id,
        activatedAt,
        expiresAt,
        nextRenewalAt: expiresAt,
      });
    }

    const quoteId = payment.metadata?.quoteId;
    if (quoteId) {
      await this.quoteRepository.update(quoteId, { status: QuoteStatus.PURCHASED });
    }

    await this.kafkaProducer.emit('payment.captured', {
      paymentId: payment.id,
      userId: user.id,
      amount: payment.amount,
      purchaseId,
      quoteId,
      timestamp: new Date().toISOString(),
    });

    return { success: true, paymentId: payment.id, purchaseId };
  }

  async handleWebhook(payload: any, signature: string): Promise<void> {
    const webhookSecret = this.configService.get<string>('razorpay.webhookSecret');
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (expectedSignature !== signature) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const event = payload.event;
    this.logger.log(`Razorpay webhook received: ${event}`);

    switch (event) {
      case 'payment.captured':
        await this.handlePaymentCaptured(payload.payload.payment.entity);
        break;
      case 'payment.failed':
        await this.handlePaymentFailed(payload.payload.payment.entity);
        break;
      case 'refund.created':
        await this.handleRefundCreated(payload.payload.refund.entity);
        break;
      default:
        this.logger.debug(`Unhandled webhook event: ${event}`);
    }
  }

  private async handlePaymentCaptured(paymentEntity: any) {
    const payment = await this.paymentRepository.findOne({
      where: { razorpayOrderId: paymentEntity.order_id },
    });

    if (!payment || payment.status === PaymentStatus.CAPTURED) return;

    await this.paymentRepository.update(payment.id, {
      razorpayPaymentId: paymentEntity.id,
      status: PaymentStatus.CAPTURED,
      paidAt: new Date(paymentEntity.created_at * 1000),
      webhookPayload: paymentEntity,
    });

    await this.kafkaProducer.emit('payment.webhook.captured', {
      paymentId: payment.id,
      razorpayPaymentId: paymentEntity.id,
      timestamp: new Date().toISOString(),
    });
  }

  private async handlePaymentFailed(paymentEntity: any) {
    const payment = await this.paymentRepository.findOne({
      where: { razorpayOrderId: paymentEntity.order_id },
    });

    if (!payment) return;

    await this.paymentRepository.update(payment.id, {
      status: PaymentStatus.FAILED,
      failureReason: paymentEntity.error_description,
      webhookPayload: paymentEntity,
    });

    const purchaseId = payment.metadata?.purchaseId;
    if (purchaseId) {
      await this.purchaseRepository.update(purchaseId, { status: PurchaseStatus.CANCELLED });
    }
  }

  private async handleRefundCreated(refundEntity: any) {
    await this.paymentRepository.update(
      { razorpayPaymentId: refundEntity.payment_id },
      {
        status: PaymentStatus.REFUNDED,
        refundId: refundEntity.id,
        refundAmount: refundEntity.amount / 100,
      },
    );
  }

  async initiateRefund(dto: RefundDto): Promise<any> {
    const payment = await this.paymentRepository.findOne({
      where: { id: dto.paymentId },
    });

    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== PaymentStatus.CAPTURED) {
      throw new BadRequestException('Only captured payments can be refunded');
    }

    const refundAmount = dto.amount
      ? Math.round(dto.amount * 100)
      : Math.round(payment.amount * 100);

    const refund = await this.razorpay.payments.refund(payment.razorpayPaymentId, {
      amount: refundAmount,
      notes: { reason: dto.reason || 'Customer requested refund' },
    });

    await this.paymentRepository.update(payment.id, {
      status: PaymentStatus.REFUNDED,
      refundId: refund.id,
      refundAmount: refundAmount / 100,
    });

    return refund;
  }

  async getPaymentStatus(paymentId: string, userId: string) {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId, userId },
    });

    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  async getPaymentHistory(userId: string, page = 1, limit = 10) {
    const [payments, total] = await this.paymentRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      payments,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}