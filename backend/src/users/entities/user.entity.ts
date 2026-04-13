import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  BeforeInsert,
  BeforeUpdate,
  Index,
} from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Exclude } from 'class-transformer';
import { UserProfile } from './user-profile.entity';
import { Quote } from '../../policies/entities/quote.entity';
import { Purchase } from '../../policies/entities/purchase.entity';
import { Payment } from '../../payments/entities/payment.entity';

export enum UserRole {
  USER = 'USER',
  AGENT = 'AGENT',
  ADMIN = 'ADMIN',
}

export enum AuthProvider {
  LOCAL = 'LOCAL',
  GOOGLE = 'GOOGLE',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ name: 'full_name' })
  fullName: string;

  @Exclude()
  @Column({ nullable: true })
  password: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: AuthProvider,
    default: AuthProvider.LOCAL,
    name: 'auth_provider',
  })
  authProvider: AuthProvider;

  @Column({ name: 'google_id', nullable: true })
  googleId: string;

  @Column({ name: 'is_email_verified', default: false })
  isEmailVerified: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Exclude()
  @Column({ name: 'refresh_token', nullable: true })
  refreshToken: string;

  @Exclude()
  @Column({ name: 'email_verification_token', nullable: true })
  emailVerificationToken: string;

  @Exclude()
  @Column({ name: 'password_reset_token', nullable: true })
  passwordResetToken: string;

  @Exclude()
  @Column({ name: 'password_reset_expires', nullable: true, type: 'timestamp' })
  passwordResetExpires: Date;

  @Column({ name: 'last_login_at', nullable: true, type: 'timestamp' })
  lastLoginAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToOne(() => UserProfile, (profile) => profile.user, { cascade: true })
  profile: UserProfile;

  @OneToMany(() => Quote, (quote) => quote.user)
  quotes: Quote[];

  @OneToMany(() => Purchase, (purchase) => purchase.user)
  purchases: Purchase[];

  @OneToMany(() => Payment, (payment) => payment.user)
  payments: Payment[];

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password && !this.password.startsWith('$2')) {
      this.password = await bcrypt.hash(this.password, 12);
    }
  }

  async validatePassword(plainPassword: string): Promise<boolean> {
    if (!this.password) return false;
    return bcrypt.compare(plainPassword, this.password);
  }
}
