import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { UserProfile } from './entities/user-profile.entity';
import { UpdateProfileDto, KycDto } from './dto/user.dto';
import { Purchase } from '../policies/entities/purchase.entity';
import { Quote } from '../policies/entities/quote.entity';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserProfile)
    private profileRepository: Repository<UserProfile>,
    @InjectRepository(Purchase)
    private purchaseRepository: Repository<Purchase>,
    @InjectRepository(Quote)
    private quoteRepository: Repository<Quote>,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['profile'],
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(email: string): Promise<User> {
    return this.userRepository.findOne({
      where: { email: email.toLowerCase() },
      relations: ['profile'],
    });
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<User> {
    const user = await this.findById(userId);

    // Update user fields
    if (dto.fullName) user.fullName = dto.fullName;
    if (dto.phone) user.phone = dto.phone;
    await this.userRepository.save(user);

    // Update profile fields
    let profile = await this.profileRepository.findOne({ where: { userId } });
    if (!profile) {
      profile = this.profileRepository.create({ userId });
    }

    const profileFields = [
      'age', 'gender', 'city', 'state', 'pincode', 'cityTier',
      'incomeBracket', 'isSmoker', 'hasDiabetes', 'hasHypertension',
      'hasHeartDisease', 'familyMembers', 'monthlyBudget', 'preferences',
    ];

    profileFields.forEach((field) => {
      if (dto[field] !== undefined) profile[field] = dto[field];
    });

    await this.profileRepository.save(profile);

    return this.findById(userId);
  }

  async getDashboard(userId: string) {
    const user = await this.findById(userId);

    const [purchases, quotes, totalPremiumResult] = await Promise.all([
      this.purchaseRepository.find({
        where: { userId },
        relations: ['policy', 'policy.insurer'],
        order: { createdAt: 'DESC' },
        take: 5,
      }),
      this.quoteRepository.find({
        where: { userId },
        relations: ['policy', 'policy.insurer'],
        order: { createdAt: 'DESC' },
        take: 5,
      }),
      this.purchaseRepository
        .createQueryBuilder('p')
        .select('SUM(p.premium_paid)', 'total')
        .where('p.user_id = :userId', { userId })
        .getRawOne(),
    ]);

    const activePolicies = purchases.filter((p) => p.status === 'ACTIVE');
    const expiringSoon = activePolicies.filter((p) => {
      if (!p.expiresAt) return false;
      const daysLeft = Math.ceil(
        (p.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );
      return daysLeft <= 30;
    });

    return {
      user: { id: user.id, fullName: user.fullName, email: user.email },
      stats: {
        totalPolicies: purchases.length,
        activePolicies: activePolicies.length,
        expiringSoon: expiringSoon.length,
        totalPremiumPaid: parseFloat(totalPremiumResult?.total || '0'),
      },
      recentPolicies: purchases,
      recentQuotes: quotes,
      expiringSoon,
    };
  }

  async getPolicies(userId: string) {
    return this.purchaseRepository.find({
      where: { userId },
      relations: ['policy', 'policy.insurer', 'payment'],
      order: { createdAt: 'DESC' },
    });
  }

  async getQuotes(userId: string) {
    return this.quoteRepository.find({
      where: { userId },
      relations: ['policy', 'policy.insurer'],
      order: { createdAt: 'DESC' },
    });
  }

  async submitKyc(userId: string, dto: KycDto): Promise<UserProfile> {
    const profile = await this.profileRepository.findOne({ where: { userId } });
    if (!profile) throw new NotFoundException('Profile not found');

    profile.kycDocumentType = dto.documentType;
    profile.kycDocumentNumber = dto.documentNumber;
    // In production: verify with KYC provider (e.g. Digio, CKYC)
    profile.kycVerified = true;

    return this.profileRepository.save(profile);
  }

  async deactivateAccount(userId: string, requestingUserId: string): Promise<void> {
    if (userId !== requestingUserId) {
      throw new ForbiddenException('Cannot deactivate another user\'s account');
    }
    await this.userRepository.update(userId, { isActive: false, refreshToken: null });
  }

  // Admin methods
  async getAllUsers(page = 1, limit = 20, search?: string) {
    const query = this.userRepository.createQueryBuilder('u')
      .leftJoinAndSelect('u.profile', 'profile')
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('u.createdAt', 'DESC');

    if (search) {
      query.where(
        'u.email ILIKE :search OR u.full_name ILIKE :search',
        { search: `%${search}%` },
      );
    }

    const [users, total] = await query.getManyAndCount();

    return {
      users,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async updateUserRole(userId: string, role: UserRole): Promise<User> {
    await this.userRepository.update(userId, { role });
    return this.findById(userId);
  }
}
