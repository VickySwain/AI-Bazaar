import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Policy } from './policy.entity';
import { Payment } from '../../payments/entities/payment.entity';

export enum PurchaseStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
  CLAIM_IN_PROGRESS = 'CLAIM_IN_PROGRESS',
}

@Entity('purchases')
export class Purchase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.purchases)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => Policy, (policy) => policy.purchases)
  @JoinColumn({ name: 'policy_id' })
  policy: Policy;

  @Column({ name: 'policy_id' })
  policyId: string;

  @OneToOne(() => Payment, (payment) => payment.purchase)
  @JoinColumn({ name: 'payment_id' })
  payment: Payment;

  @Column({ name: 'payment_id', nullable: true })
  paymentId: string;

  @Column({ name: 'policy_number', unique: true, nullable: true })
  policyNumber: string;

  @Column({ name: 'premium_paid', type: 'decimal', precision: 12, scale: 2 })
  premiumPaid: number;

  @Column({ name: 'sum_assured', type: 'decimal', precision: 15, scale: 2, nullable: true })
  sumAssured: number;

  @Column({ type: 'enum', enum: PurchaseStatus, default: PurchaseStatus.PENDING })
  status: PurchaseStatus;

  @Column({ name: 'insured_details', type: 'jsonb', nullable: true })
  insuredDetails: Record<string, any>;

  @Column({ name: 'nominee_details', type: 'jsonb', nullable: true })
  nomineeDetails: Record<string, any>;

  @Column({ name: 'document_url', nullable: true })
  documentUrl: string;

  @Column({ name: 'activated_at', type: 'timestamp', nullable: true })
  activatedAt: Date;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ name: 'next_renewal_at', type: 'timestamp', nullable: true })
  nextRenewalAt: Date;

  @Column({ name: 'external_policy_id', nullable: true })
  externalPolicyId: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
