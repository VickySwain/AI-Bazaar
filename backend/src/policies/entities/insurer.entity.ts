import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Policy } from './policy.entity';

@Entity('insurers')
export class Insurer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column()
  slug: string;

  @Column({ name: 'logo_url', nullable: true })
  logoUrl: string;

  @Column({ name: 'api_endpoint', nullable: true })
  apiEndpoint: string;

  @Column({ name: 'api_key', nullable: true })
  apiKey: string;

  @Column({ name: 'adapter_class' })
  adapterClass: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'claim_settlement_ratio', type: 'decimal', precision: 5, scale: 2, nullable: true })
  claimSettlementRatio: number;

  @Column({ name: 'established_year', nullable: true })
  establishedYear: number;

  @Column({ name: 'total_policies_sold', default: 0 })
  totalPoliciesSold: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Policy, (policy) => policy.insurer)
  policies: Policy[];
}
