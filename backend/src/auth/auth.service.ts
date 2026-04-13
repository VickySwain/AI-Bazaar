import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcryptjs';
import { User, AuthProvider, UserRole } from '../users/entities/user.entity';
import { UserProfile } from '../users/entities/user-profile.entity';
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
} from './dto/auth.dto';
import { NotificationsService } from '../notifications/notifications.service';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: Partial<User>;
  tokens: AuthTokens;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserProfile)
    private profileRepository: Repository<UserProfile>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private notificationsService: NotificationsService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await this.userRepository.findOne({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const verificationToken = uuidv4();

    const user = this.userRepository.create({
      email: dto.email.toLowerCase(),
      fullName: dto.fullName,
      password: dto.password,
      phone: dto.phone,
      emailVerificationToken: verificationToken,
    });

    await this.userRepository.save(user);

    // Create empty profile
    const profile = this.profileRepository.create({ userId: user.id });
    await this.profileRepository.save(profile);

    // Send verification email (non-blocking)
    this.notificationsService
      .sendEmailVerification(user.email, user.fullName, verificationToken)
      .catch((err) => this.logger.error('Failed to send verification email', err));

    const tokens = await this.generateTokens(user);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return { user: this.sanitizeUser(user), tokens };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.userRepository.findOne({
      where: { email: dto.email.toLowerCase() },
      relations: ['profile'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account has been deactivated. Please contact support.');
    }

    const isPasswordValid = await user.validatePassword(dto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.userRepository.update(user.id, { lastLoginAt: new Date() });

    const tokens = await this.generateTokens(user);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return { user: this.sanitizeUser(user), tokens };
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    if (!user) return null;

    const isValid = await user.validatePassword(password);
    return isValid ? user : null;
  }

  async googleLogin(googleUser: any): Promise<AuthResponse> {
    let user = await this.userRepository.findOne({
      where: [{ googleId: googleUser.googleId }, { email: googleUser.email }],
      relations: ['profile'],
    });

    if (!user) {
      user = this.userRepository.create({
        email: googleUser.email.toLowerCase(),
        fullName: googleUser.fullName,
        googleId: googleUser.googleId,
        authProvider: AuthProvider.GOOGLE,
        isEmailVerified: true,
      });
      await this.userRepository.save(user);

      const profile = this.profileRepository.create({
        userId: user.id,
        avatarUrl: googleUser.avatarUrl,
      });
      await this.profileRepository.save(profile);
    } else if (!user.googleId) {
      await this.userRepository.update(user.id, {
        googleId: googleUser.googleId,
        isEmailVerified: true,
      });
    }

    await this.userRepository.update(user.id, { lastLoginAt: new Date() });

    const tokens = await this.generateTokens(user);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return { user: this.sanitizeUser(user), tokens };
  }

  async refreshTokens(user: User): Promise<AuthTokens> {
    const tokens = await this.generateTokens(user);
    await this.storeRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  async logout(userId: string): Promise<void> {
    await this.userRepository.update(userId, { refreshToken: null });
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { email: dto.email.toLowerCase() },
    });

    // Always return success to prevent email enumeration
    if (!user) return;

    const resetToken = uuidv4();
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.userRepository.update(user.id, {
      passwordResetToken: resetToken,
      passwordResetExpires: resetExpires,
    });

    this.notificationsService
      .sendPasswordReset(user.email, user.fullName, resetToken)
      .catch((err) => this.logger.error('Failed to send password reset email', err));
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { passwordResetToken: dto.token },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (user.passwordResetExpires < new Date()) {
      throw new BadRequestException('Reset token has expired. Please request a new one.');
    }

    await this.userRepository.update(user.id, {
      password: dto.password,
      passwordResetToken: null,
      passwordResetExpires: null,
      refreshToken: null,
    });

    // Force re-hash via entity hook by saving through entity
    const updatedUser = await this.userRepository.findOne({ where: { id: user.id } });
    updatedUser.password = dto.password;
    await this.userRepository.save(updatedUser);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) throw new NotFoundException('User not found');

    const isValid = await user.validatePassword(dto.currentPassword);
    if (!isValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    user.password = dto.newPassword;
    await this.userRepository.save(user);

    // Invalidate all sessions
    await this.userRepository.update(userId, { refreshToken: null });
  }

  async verifyEmail(token: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    await this.userRepository.update(user.id, {
      isEmailVerified: true,
      emailVerificationToken: null,
    });
  }

  private async generateTokens(user: User): Promise<AuthTokens> {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.secret'),
        expiresIn: this.configService.get<string>('jwt.accessExpiry'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: this.configService.get<string>('jwt.refreshExpiry'),
      }),
    ]);

    return { accessToken, refreshToken, expiresIn: 900 }; // 15 min in seconds
  }

  private async storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const hashed = await bcrypt.hash(refreshToken, 10);
    await this.userRepository.update(userId, { refreshToken: hashed });
  }

  private sanitizeUser(user: User): Partial<User> {
    return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    role: user.role,
    authProvider: user.authProvider,
    isEmailVerified: user.isEmailVerified,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
  }
}
