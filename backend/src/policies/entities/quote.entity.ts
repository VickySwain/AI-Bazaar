import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Policy } from './policy.entity';

export enum QuoteStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  PURCHASED = 'PURCHASED',
  CANCELLED = 'CANCELLED',
}

@Entity('quotes')
export class Quote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.quotes)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => Policy, (policy) => policy.quotes)
  @JoinColumn({ name: 'policy_id' })
  policy: Policy;

  @Column({ name: 'policy_id' })
  policyId: string;

  @Column({ name: 'quoted_premium', type: 'decimal', precision: 12, scale: 2 })
  quotedPremium: number;

  @Column({ name: 'annual_premium', type: 'decimal', precision: 12, scale: 2 })
  annualPremium: number;

  @Column({ name: 'gst_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  gstAmount: number;

  @Column({ name: 'total_premium', type: 'decimal', precision: 12, scale: 2 })
  totalPremium: number;

  @Column({ type: 'jsonb', nullable: true })
  parameters: Record<string, any>;

  @Column({ type: 'enum', enum: QuoteStatus, default: QuoteStatus.ACTIVE })
  status: QuoteStatus;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
