import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Insurer } from './insurer.entity';
import { Quote } from './quote.entity';
import { Purchase } from './purchase.entity';

export enum PolicyCategory {
  HEALTH = 'HEALTH',
  LIFE = 'LIFE',
  TERM = 'TERM',
  MOTOR = 'MOTOR',
  TRAVEL = 'TRAVEL',
  HOME = 'HOME',
}

export enum PolicyStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DRAFT = 'DRAFT',
}

@Entity('policies')
export class Policy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Insurer, (insurer) => insurer.policies)
  @JoinColumn({ name: 'insurer_id' })
  insurer: Insurer;

  @Column({ name: 'insurer_id' })
  insurerId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Index()
  @Column({ type: 'enum', enum: PolicyCategory })
  category: PolicyCategory;

  @Column({ name: 'base_premium', type: 'decimal', precision: 12, scale: 2 })
  basePremium: number;

  @Column({ name: 'sum_assured', type: 'decimal', precision: 15, scale: 2, nullable: true })
  sumAssured: number;

  @Column({ name: 'min_age', default: 18 })
  minAge: number;

  @Column({ name: 'max_age', default: 65 })
  maxAge: number;

  @Column({ name: 'policy_term_years', nullable: true })
  policyTermYears: number;

  @Column({ name: 'premium_paying_term', nullable: true })
  premiumPayingTerm: number;

  @Column({ name: 'waiting_period_days', default: 30 })
  waitingPeriodDays: number;

  @Column({ name: 'cashless_hospitals', nullable: true })
  cashlessHospitals: number;

  @Column({ name: 'room_rent_limit', nullable: true })
  roomRentLimit: string;

  @Column({ name: 'co_payment_percent', type: 'decimal', precision: 5, scale: 2, default: 0 })
  coPaymentPercent: number;

  @Column({ name: 'coverage_details', type: 'jsonb', nullable: true })
  coverageDetails: Record<string, any>;

  @Column({ name: 'inclusions', type: 'jsonb', nullable: true })
  inclusions: string[];

  @Column({ name: 'exclusions', type: 'jsonb', nullable: true })
  exclusions: string[];

  @Column({ name: 'riders', type: 'jsonb', nullable: true })
  riders: Record<string, any>[];

  @Column({ name: 'claim_process', nullable: true })
  claimProcess: string;

  @Column({ name: 'brochure_url', nullable: true })
  brochureUrl: string;

  @Column({ name: 'is_featured', default: false })
  isFeatured: boolean;

  @Column({ name: 'popularity_score', type: 'decimal', precision: 5, scale: 2, default: 0 })
  popularityScore: number;

  @Column({ name: 'avg_rating', type: 'decimal', precision: 3, scale: 2, default: 0 })
  avgRating: number;

  @Column({ name: 'total_reviews', default: 0 })
  totalReviews: number;

  @Column({ type: 'enum', enum: PolicyStatus, default: PolicyStatus.ACTIVE })
  status: PolicyStatus;

  @Column({ name: 'external_id', nullable: true })
  externalId: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Quote, (quote) => quote.policy)
  quotes: Quote[];

  @OneToMany(() => Purchase, (purchase) => purchase.policy)
  purchases: Purchase[];
}
