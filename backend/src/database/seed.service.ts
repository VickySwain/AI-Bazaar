import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Insurer } from '../policies/entities/insurer.entity';
import { Policy, PolicyCategory, PolicyStatus } from '../policies/entities/policy.entity';
import { User, UserRole, AuthProvider } from '../users/entities/user.entity';
import { UserProfile } from '../users/entities/user-profile.entity';

@Injectable()
export class DatabaseSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DatabaseSeedService.name);

  constructor(
    @InjectRepository(Insurer)
    private insurerRepository: Repository<Insurer>,
    @InjectRepository(Policy)
    private policyRepository: Repository<Policy>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserProfile)
    private profileRepository: Repository<UserProfile>,
    private configService: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    await this.seedInsurers();
    await this.seedPolicies();
    await this.seedAdminUser();
  }

  private async seedInsurers() {
    const count = await this.insurerRepository.count();
    if (count > 0) return;

    this.logger.log('Seeding insurers...');

    const insurers = [
      {
        name: 'Life Insurance Corporation of India',
        slug: 'lic',
        adapterClass: 'LicAdapter',
        claimSettlementRatio: 98.62,
        establishedYear: 1956,
        isActive: true,
        metadata: { irda_reg: 'LIC', type: 'PSU' },
      },
      {
        name: 'HDFC Life Insurance',
        slug: 'hdfc-life',
        adapterClass: 'HdfcAdapter',
        claimSettlementRatio: 99.39,
        establishedYear: 2000,
        isActive: true,
        metadata: { irda_reg: 'HDFC', type: 'Private' },
      },
      {
        name: 'ICICI Prudential Life Insurance',
        slug: 'icici-pru',
        adapterClass: 'HdfcAdapter', // reusing adapter for seed
        claimSettlementRatio: 97.82,
        establishedYear: 2001,
        isActive: true,
        metadata: { irda_reg: 'ICICI', type: 'Private' },
      },
      {
        name: 'Star Health Insurance',
        slug: 'star-health',
        adapterClass: 'HdfcAdapter',
        claimSettlementRatio: 99.06,
        establishedYear: 2006,
        isActive: true,
        metadata: { irda_reg: 'STAR', type: 'Standalone Health' },
      },
    ];

    await this.insurerRepository.save(insurers);
    this.logger.log(`Seeded ${insurers.length} insurers`);
  }

  private async seedPolicies() {
    const count = await this.policyRepository.count();
    if (count > 0) return;

    this.logger.log('Seeding policies...');

    const insurers = await this.insurerRepository.find();
    const licInsurer = insurers.find((i) => i.slug === 'lic');
    const hdfcInsurer = insurers.find((i) => i.slug === 'hdfc-life');
    const iciciInsurer = insurers.find((i) => i.slug === 'icici-pru');
    const starInsurer = insurers.find((i) => i.slug === 'star-health');

    if (!licInsurer || !hdfcInsurer) return;

    const policies: Partial<Policy>[] = [
      // ── TERM LIFE ───────────────────────────────────────────
      {
        insurerId: hdfcInsurer.id,
        name: 'HDFC Life Click 2 Protect Super',
        description: 'Comprehensive term plan with critical illness coverage and return of premium option.',
        category: PolicyCategory.TERM,
        basePremium: 7200,
        sumAssured: 10000000,
        minAge: 18,
        maxAge: 65,
        policyTermYears: 30,
        waitingPeriodDays: 0,
        inclusions: ['Life Cover', 'Critical Illness Rider', 'Accidental Death', 'Waiver of Premium on Disability'],
        exclusions: ['Suicide within 12 months', 'Hazardous activities without disclosure'],
        coverageDetails: { criticalIllnessCover: 5000000, returnOfPremium: true },
        isFeatured: true,
        popularityScore: 9.2,
        avgRating: 4.7,
        totalReviews: 2841,
        status: PolicyStatus.ACTIVE,
        externalId: 'HDFC-CLICK2PROTECT-SUPER',
      },
      {
        insurerId: licInsurer.id,
        name: 'LIC New Jeevan Amar',
        description: "India's most trusted term insurance with flexible coverage options.",
        category: PolicyCategory.TERM,
        basePremium: 8400,
        sumAssured: 5000000,
        minAge: 18,
        maxAge: 65,
        policyTermYears: 35,
        waitingPeriodDays: 0,
        inclusions: ['Death Benefit', 'Tax Benefits 80C & 10D', 'Accidental Death Benefit'],
        exclusions: ['Suicide within 1 year', 'War or civil commotion'],
        coverageDetails: { flexiblePaymentModes: true, specialRateForWomen: true },
        isFeatured: true,
        popularityScore: 9.5,
        avgRating: 4.6,
        totalReviews: 5120,
        status: PolicyStatus.ACTIVE,
        externalId: 'LIC-NEW-JEEVAN-AMAR-855',
      },
      {
        insurerId: iciciInsurer.id,
        name: 'ICICI Pru iProtect Smart',
        description: 'Smart term plan with life, health, and income protection under one plan.',
        category: PolicyCategory.TERM,
        basePremium: 6800,
        sumAssured: 10000000,
        minAge: 18,
        maxAge: 60,
        policyTermYears: 40,
        waitingPeriodDays: 0,
        inclusions: ['Life Cover', '34 Critical Illnesses', 'Terminal Illness', 'Disability Cover'],
        exclusions: ['HIV/AIDS unless accidental', 'Aviation accident unless commercial'],
        coverageDetails: { criticalIllnessCover: true, incomeBenefit: true },
        isFeatured: false,
        popularityScore: 8.8,
        avgRating: 4.5,
        totalReviews: 1920,
        status: PolicyStatus.ACTIVE,
        externalId: 'ICICI-IPROTECT-SMART',
      },

      // ── HEALTH ──────────────────────────────────────────────
      {
        insurerId: hdfcInsurer.id,
        name: 'HDFC ERGO Optima Restore',
        description: 'Premium health plan with automatic 100% restore benefit, no room rent capping.',
        category: PolicyCategory.HEALTH,
        basePremium: 9800,
        sumAssured: 500000,
        minAge: 18,
        maxAge: 65,
        waitingPeriodDays: 30,
        cashlessHospitals: 13000,
        coPaymentPercent: 0,
        inclusions: [
          'Hospitalization', 'Day Care Procedures', 'Domiciliary Treatment',
          'OPD Cover', 'Mental Illness', 'Restore Benefit', 'No Claim Bonus 50%',
        ],
        exclusions: ['Pre-existing diseases (2yr wait)', 'Cosmetic surgery', 'Dental (unless accidental)'],
        coverageDetails: {
          roomRent: 'No capping',
          preHospitalization: '60 days',
          postHospitalization: '180 days',
          restoreBenefit: '100% automatic',
        },
        isFeatured: true,
        popularityScore: 9.1,
        avgRating: 4.8,
        totalReviews: 3640,
        status: PolicyStatus.ACTIVE,
        externalId: 'HDFC-OPTIMA-RESTORE',
      },
      {
        insurerId: starInsurer.id,
        name: 'Star Comprehensive Insurance Policy',
        description: "Star Health's flagship plan with extensive OPD coverage and no co-payment for most claims.",
        category: PolicyCategory.HEALTH,
        basePremium: 11200,
        sumAssured: 1000000,
        minAge: 18,
        maxAge: 65,
        waitingPeriodDays: 30,
        cashlessHospitals: 14000,
        coPaymentPercent: 0,
        inclusions: [
          'In-patient Hospitalisation', 'OPD Treatment', 'Modern Treatments',
          'Organ Donor Expenses', 'Second Opinion', 'Air Ambulance', 'Maternity (after 3yr)',
        ],
        exclusions: ['Obesity treatment', 'Hormone replacement therapy', 'Self-inflicted injury'],
        coverageDetails: {
          roomRent: 'Single AC room',
          maternity: 'After 3 years waiting period',
          newBornCover: 'From Day 1',
        },
        isFeatured: true,
        popularityScore: 8.9,
        avgRating: 4.6,
        totalReviews: 2280,
        status: PolicyStatus.ACTIVE,
        externalId: 'STAR-COMPREHENSIVE',
      },

      // ── LIFE / ENDOWMENT ────────────────────────────────────
      {
        insurerId: licInsurer.id,
        name: 'LIC Jeevan Anand',
        description: 'Participating endowment plan offering both protection and savings with bonus.',
        category: PolicyCategory.LIFE,
        basePremium: 12500,
        sumAssured: 1000000,
        minAge: 18,
        maxAge: 50,
        policyTermYears: 35,
        premiumPayingTerm: 35,
        waitingPeriodDays: 0,
        inclusions: ['Death Benefit + Bonus', 'Maturity Benefit', 'Accidental Death Rider', 'Loan Facility'],
        exclusions: ['Suicide within 1 year', 'Illegal activities'],
        coverageDetails: {
          bonusRate: 'Rs 42 per 1000 SA',
          loanAvailable: true,
          reversionaryBonus: true,
        },
        isFeatured: false,
        popularityScore: 8.4,
        avgRating: 4.4,
        totalReviews: 6810,
        status: PolicyStatus.ACTIVE,
        externalId: 'LIC-JEEVAN-ANAND-149',
      },
      {
        insurerId: hdfcInsurer.id,
        name: 'HDFC Life Sanchay Plus',
        description: 'Guaranteed returns plan offering up to 5.56% p.a. with life cover.',
        category: PolicyCategory.LIFE,
        basePremium: 25000,
        sumAssured: 3000000,
        minAge: 30,
        maxAge: 65,
        waitingPeriodDays: 0,
        inclusions: ['Guaranteed Returns', 'Life Cover', 'Flexible Payout Options', 'Tax Benefits'],
        exclusions: ['Market risk (not ULIP)', 'Early surrender with penalty'],
        coverageDetails: {
          guaranteedReturns: '5.56% p.a.',
          payoutOptions: ['Lump Sum', 'Regular Income', 'Deferred Income'],
        },
        isFeatured: false,
        popularityScore: 8.0,
        avgRating: 4.3,
        totalReviews: 1540,
        status: PolicyStatus.ACTIVE,
        externalId: 'HDFC-SANCHAY-PLUS',
      },

      // ── MOTOR ───────────────────────────────────────────────
      {
        insurerId: hdfcInsurer.id,
        name: 'HDFC ERGO Comprehensive Car Insurance',
        description: 'End-to-end car coverage with zero depreciation and roadside assistance.',
        category: PolicyCategory.MOTOR,
        basePremium: 4500,
        sumAssured: 500000,
        minAge: 18,
        maxAge: 70,
        waitingPeriodDays: 0,
        inclusions: ['Own Damage', 'Third-party Liability', 'Theft', 'Natural Calamities', 'Roadside Assistance'],
        exclusions: ['Drunk driving', 'Driving without valid licence', 'Wear and tear'],
        coverageDetails: {
          zeroDep: true,
          engineProtection: true,
          returnToInvoice: 'Optional',
          ncbProtection: true,
        },
        isFeatured: false,
        popularityScore: 7.8,
        avgRating: 4.2,
        totalReviews: 1120,
        status: PolicyStatus.ACTIVE,
        externalId: 'HDFC-CAR-COMPREHENSIVE',
      },

      // ── TRAVEL ──────────────────────────────────────────────
      {
        insurerId: hdfcInsurer.id,
        name: 'HDFC ERGO Travel Insurance',
        description: 'Comprehensive travel protection for domestic and international trips.',
        category: PolicyCategory.TRAVEL,
        basePremium: 899,
        sumAssured: 2500000,
        minAge: 0,
        maxAge: 75,
        waitingPeriodDays: 0,
        inclusions: [
          'Medical Emergencies', 'Trip Cancellation', 'Baggage Loss',
          'Passport Loss', 'Flight Delay', 'Personal Accident',
        ],
        exclusions: ['Pre-existing conditions for medical claim', 'Adventure sports (without rider)'],
        coverageDetails: {
          emergencyMedical: 2500000,
          tripCancellation: 75000,
          baggageLoss: 50000,
          flightDelay: '6 hours',
        },
        isFeatured: false,
        popularityScore: 7.5,
        avgRating: 4.4,
        totalReviews: 890,
        status: PolicyStatus.ACTIVE,
        externalId: 'HDFC-TRAVEL-GLOBAL',
      },
    ];

    await this.policyRepository.save(policies);
    this.logger.log(`Seeded ${policies.length} policies`);
  }

  private async seedAdminUser() {
    const existing = await this.userRepository.findOne({
      where: { email: 'admin@coverai.in' },
    });
    if (existing) return;

    this.logger.log('Seeding admin user...');

    const admin = this.userRepository.create({
      email: 'admin@coverai.in',
      fullName: 'CoverAI Admin',
      password: 'Admin@123456',
      role: UserRole.ADMIN,
      isEmailVerified: true,
      authProvider: AuthProvider.LOCAL,
    });
    const savedAdmin = await this.userRepository.save(admin);

    const profile = this.profileRepository.create({ userId: savedAdmin.id });
    await this.profileRepository.save(profile);

    this.logger.log('Admin user created: admin@coverai.in / Admin@123456');
  }
}
