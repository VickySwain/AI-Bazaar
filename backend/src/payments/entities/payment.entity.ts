import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Purchase } from '../../policies/entities/purchase.entity';

export enum PaymentStatus {
  PENDING = 'PENDING',
  CREATED = 'CREATED',
  CAPTURED = 'CAPTURED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
}

export enum PaymentMethod {
  CARD = 'CARD',
  UPI = 'UPI',
  NET_BANKING = 'NET_BANKING',
  WALLET = 'WALLET',
  EMI = 'EMI',
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.payments)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @OneToOne(() => Purchase, (purchase) => purchase.payment)
  purchase: Purchase;

  @Index({ unique: true })
  @Column({ name: 'idempotency_key', unique: true })
  idempotencyKey: string;

  @Column({ name: 'razorpay_order_id', unique: true, nullable: true })
  razorpayOrderId: string;

  @Column({ name: 'razorpay_payment_id', nullable: true })
  razorpayPaymentId: string;

  @Column({ name: 'razorpay_signature', nullable: true })
  razorpaySignature: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ default: 'INR' })
  currency: string;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    nullable: true,
    name: 'payment_method',
  })
  paymentMethod: PaymentMethod;

  @Column({ nullable: true })
  description: string;

  @Column({ name: 'failure_reason', nullable: true })
  failureReason: string;

  @Column({ name: 'refund_amount', type: 'decimal', precision: 12, scale: 2, nullable: true })
  refundAmount: number;

  @Column({ name: 'refund_id', nullable: true })
  refundId: string;

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt: Date;

  @Column({ name: 'webhook_payload', type: 'jsonb', nullable: true })
  webhookPayload: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
