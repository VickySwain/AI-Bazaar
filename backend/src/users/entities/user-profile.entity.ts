import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum IncomeBracket {
  BELOW_3L = 'BELOW_3L',
  THREE_TO_6L = '3L_TO_6L',
  SIX_TO_10L = '6L_TO_10L',
  TEN_TO_20L = '10L_TO_20L',
  ABOVE_20L = 'ABOVE_20L',
}

export enum CityTier {
  TIER_1 = 'TIER_1',
  TIER_2 = 'TIER_2',
  TIER_3 = 'TIER_3',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

@Entity('user_profiles')
export class UserProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, (user) => user.profile)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ nullable: true })
  age: number;

  @Column({ type: 'enum', enum: Gender, nullable: true })
  gender: Gender;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  state: string;

  @Column({ nullable: true })
  pincode: string;

  @Column({
    type: 'enum',
    enum: CityTier,
    nullable: true,
    name: 'city_tier',
  })
  cityTier: CityTier;

  @Column({
    type: 'enum',
    enum: IncomeBracket,
    nullable: true,
    name: 'income_bracket',
  })
  incomeBracket: IncomeBracket;

  @Column({ name: 'is_smoker', default: false })
  isSmoker: boolean;

  @Column({ name: 'has_diabetes', default: false })
  hasDiabetes: boolean;

  @Column({ name: 'has_hypertension', default: false })
  hasHypertension: boolean;

  @Column({ name: 'has_heart_disease', default: false })
  hasHeartDisease: boolean;

  @Column({ name: 'family_members', default: 1 })
  familyMembers: number;

  @Column({ name: 'monthly_budget', type: 'decimal', precision: 10, scale: 2, nullable: true })
  monthlyBudget: number;

  @Column({ name: 'existing_coverage', type: 'jsonb', nullable: true })
  existingCoverage: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  preferences: Record<string, any>;

  @Column({ name: 'kyc_verified', default: false })
  kycVerified: boolean;

  @Column({ name: 'kyc_document_type', nullable: true })
  kycDocumentType: string;

  @Column({ name: 'kyc_document_number', nullable: true })
  kycDocumentNumber: string;

  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
