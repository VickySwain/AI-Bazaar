import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Policy } from '../../policies/entities/policy.entity';

@Entity('recommendations')
export class Recommendation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Index()
  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => Policy)
  @JoinColumn({ name: 'policy_id' })
  policy: Policy;

  @Column({ name: 'policy_id' })
  policyId: string;

  @Column({ type: 'decimal', precision: 6, scale: 4 })
  score: number;

  @Column({ name: 'rank_position' })
  rankPosition: number;

  @Column({ name: 'model_version' })
  modelVersion: string;

  @Column({ name: 'recommendation_context', type: 'jsonb', nullable: true })
  recommendationContext: Record<string, any>;

  @Column({ name: 'feature_values', type: 'jsonb', nullable: true })
  featureValues: Record<string, any>;

  @Column({ name: 'was_clicked', default: false })
  wasClicked: boolean;

  @Column({ name: 'was_purchased', default: false })
  wasPurchased: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
