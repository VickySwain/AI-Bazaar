import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, SelectQueryBuilder } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import * as crypto from 'crypto';
import { Policy, PolicyCategory, PolicyStatus } from './entities/policy.entity';
import { Insurer } from './entities/insurer.entity';
import { Quote, QuoteStatus } from './entities/quote.entity';
import { User } from '../users/entities/user.entity';
import { FilterPoliciesDto, ComparePoliciesDto, CreateQuoteDto, CreatePolicyDto } from './dto/policy.dto';
import { AdapterRegistryService } from './adapters/adapter-registry.service';
import { KafkaProducerService } from '../common/kafka/kafka-producer.service';

@Injectable()
export class PoliciesService {
  private readonly logger = new Logger(PoliciesService.name);
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(
    @InjectRepository(Policy)
    private policyRepository: Repository<Policy>,
    @InjectRepository(Insurer)
    private insurerRepository: Repository<Insurer>,
    @InjectRepository(Quote)
    private quoteRepository: Repository<Quote>,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
    private adapterRegistry: AdapterRegistryService,
    private kafkaProducer: KafkaProducerService,
  ) {}

  async findAll(dto: FilterPoliciesDto) {
    const cacheKey = `policies:list:${this.hashFilter(dto)}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit: ${cacheKey}`);
      return cached;
    }

    const query = this.buildPolicyQuery(dto);
    const [policies, total] = await query.getManyAndCount();

    const result = {
      policies,
      pagination: {
        page: dto.page || 1,
        limit: dto.limit || 10,
        total,
        totalPages: Math.ceil(total / (dto.limit || 10)),
      },
    };

    await this.cacheManager.set(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  private buildPolicyQuery(dto: FilterPoliciesDto): SelectQueryBuilder<Policy> {
    const query = this.policyRepository
      .createQueryBuilder('policy')
      .leftJoinAndSelect('policy.insurer', 'insurer')
      .where('policy.status = :status', { status: PolicyStatus.ACTIVE });

    if (dto.category) {
      query.andWhere('policy.category = :category', { category: dto.category });
    }

    if (dto.minPremium !== undefined) {
      query.andWhere('policy.base_premium >= :minPremium', { minPremium: dto.minPremium });
    }

    if (dto.maxPremium !== undefined) {
      query.andWhere('policy.base_premium <= :maxPremium', { maxPremium: dto.maxPremium });
    }

    if (dto.minSumAssured !== undefined) {
      query.andWhere('policy.sum_assured >= :minSumAssured', { minSumAssured: dto.minSumAssured });
    }

    if (dto.maxSumAssured !== undefined) {
      query.andWhere('policy.sum_assured <= :maxSumAssured', { maxSumAssured: dto.maxSumAssured });
    }

    if (dto.age !== undefined) {
      query
        .andWhere('policy.min_age <= :age', { age: dto.age })
        .andWhere('policy.max_age >= :age', { age: dto.age });
    }

    if (dto.insurerIds?.length) {
      query.andWhere('policy.insurer_id IN (:...insurerIds)', { insurerIds: dto.insurerIds });
    }

    if (dto.isFeatured !== undefined) {
      query.andWhere('policy.is_featured = :isFeatured', { isFeatured: dto.isFeatured });
    }

    if (dto.search) {
      query.andWhere(
        '(policy.name ILIKE :search OR policy.description ILIKE :search)',
        { search: `%${dto.search}%` },
      );
    }

    const allowedSortFields = ['basePremium', 'sumAssured', 'popularityScore', 'avgRating', 'createdAt'];
    const sortField = allowedSortFields.includes(dto.sortBy) ? dto.sortBy : 'popularityScore';
    query.orderBy(`policy.${sortField}`, dto.sortOrder || 'DESC');

    const page = dto.page || 1;
    const limit = dto.limit || 10;
    query.skip((page - 1) * limit).take(limit);

    return query;
  }

  async findOne(id: string): Promise<Policy> {
    const cacheKey = `policy:${id}`;
    const cached = await this.cacheManager.get<Policy>(cacheKey);
    if (cached) return cached;

    const policy = await this.policyRepository.findOne({
      where: { id },
      relations: ['insurer'],
    });

    if (!policy) throw new NotFoundException(`Policy with ID ${id} not found`);

    await this.cacheManager.set(cacheKey, policy, this.CACHE_TTL);
    return policy;
  }

  async compare(dto: ComparePoliciesDto) {
    if (dto.policyIds.length < 2 || dto.policyIds.length > 4) {
      throw new BadRequestException('You must compare between 2 and 4 policies');
    }

    const cacheKey = `policies:compare:${dto.policyIds.sort().join(',')}:${dto.age}:${dto.sumAssured}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const policies = await this.policyRepository.find({
      where: { id: In(dto.policyIds) },
      relations: ['insurer'],
    });

    if (policies.length !== dto.policyIds.length) {
      throw new NotFoundException('One or more policies not found');
    }

    // Calculate dynamic quotes if age is provided
    const enrichedPolicies = await Promise.all(
      policies.map(async (policy) => {
        let quote = null;
        if (dto.age && policy.insurer) {
          try {
            const adapter = this.adapterRegistry.getAdapter(policy.insurer.adapterClass);
            if (adapter) {
              quote = await adapter.fetchQuote(policy.externalId, {
                age: dto.age,
                sumAssured: dto.sumAssured,
              });
            }
          } catch (err) {
            this.logger.warn(`Failed to fetch quote for policy ${policy.id}: ${err.message}`);
          }
        }
        return { ...policy, liveQuote: quote };
      }),
    );

    // Build comparison matrix
    const comparisonMatrix = this.buildComparisonMatrix(enrichedPolicies);

    const result = { policies: enrichedPolicies, comparisonMatrix };
    await this.cacheManager.set(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  private buildComparisonMatrix(policies: any[]) {
    const fields = [
      { key: 'basePremium', label: 'Annual Premium', format: 'currency' },
      { key: 'sumAssured', label: 'Sum Assured', format: 'currency' },
      { key: 'minAge', label: 'Minimum Age', format: 'number' },
      { key: 'maxAge', label: 'Maximum Age', format: 'number' },
      { key: 'waitingPeriodDays', label: 'Waiting Period (Days)', format: 'number' },
      { key: 'cashlessHospitals', label: 'Cashless Hospitals', format: 'number' },
      { key: 'coPaymentPercent', label: 'Co-payment', format: 'percent' },
      { key: 'avgRating', label: 'Rating', format: 'rating' },
    ];

    return fields.map((field) => ({
      ...field,
      values: policies.map((p) => ({
        policyId: p.id,
        value: p[field.key],
        isBest: this.isBestValue(field.key, p[field.key], policies),
      })),
    }));
  }

  private isBestValue(field: string, value: any, policies: any[]): boolean {
    if (value === null || value === undefined) return false;
    const lowerIsBetter = ['basePremium', 'waitingPeriodDays', 'coPaymentPercent', 'minAge'];
    const values = policies.map((p) => p[field]).filter((v) => v !== null && v !== undefined);
    if (lowerIsBetter.includes(field)) {
      return value === Math.min(...values);
    }
    return value === Math.max(...values);
  }

  async createQuote(user: User, dto: CreateQuoteDto): Promise<Quote> {
    const policy = await this.findOne(dto.policyId);

    // Validate age eligibility
    const age = dto.age || user.profile?.age;
    if (age) {
      if (age < policy.minAge || age > policy.maxAge) {
        throw new BadRequestException(
          `Age ${age} is not eligible for this policy (${policy.minAge}-${policy.maxAge} years)`,
        );
      }
    }

    // Get quote from insurer adapter
    let quotedPremium = policy.basePremium;
    let annualPremium = policy.basePremium;
    let gstAmount = Math.round(annualPremium * 0.18);
    let totalPremium = annualPremium + gstAmount;

    if (policy.insurer?.adapterClass) {
      try {
        const adapter = this.adapterRegistry.getAdapter(policy.insurer.adapterClass);
        if (adapter) {
          const liveQuote = await adapter.fetchQuote(policy.externalId, {
            age: age || 30,
            sumAssured: dto.sumAssured,
            policyTerm: dto.policyTerm,
            ...dto.parameters,
          });
          quotedPremium = liveQuote.quotedPremium;
          annualPremium = liveQuote.annualPremium;
          gstAmount = liveQuote.gstAmount;
          totalPremium = liveQuote.totalPremium;
        }
      } catch (err) {
        this.logger.warn(`Live quote failed, using base premium: ${err.message}`);
      }
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const quote = this.quoteRepository.create({
      userId: user.id,
      policyId: policy.id,
      quotedPremium,
      annualPremium,
      gstAmount,
      totalPremium,
      parameters: { age, sumAssured: dto.sumAssured, ...dto.parameters },
      expiresAt,
    });

    const saved = await this.quoteRepository.save(quote);

    // Emit event to Kafka for analytics
    await this.kafkaProducer.emit('policy.quote.created', {
      userId: user.id,
      policyId: policy.id,
      quoteId: saved.id,
      category: policy.category,
      premium: totalPremium,
      timestamp: new Date().toISOString(),
    });

    return saved;
  }

  async create(dto: CreatePolicyDto): Promise<Policy> {
    const insurer = await this.insurerRepository.findOne({ where: { id: dto.insurerId } });
    if (!insurer) throw new NotFoundException('Insurer not found');

    const policy = this.policyRepository.create(dto);
    const saved = await this.policyRepository.save(policy);
    await this.cacheManager.reset();
    return saved;
  }

  async update(id: string, dto: Partial<CreatePolicyDto>): Promise<Policy> {
    const policy = await this.findOne(id);
    Object.assign(policy, dto);
    const saved = await this.policyRepository.save(policy);
    await this.cacheManager.del(`policy:${id}`);
    return saved;
  }

  async remove(id: string): Promise<void> {
    const policy = await this.findOne(id);
    await this.policyRepository.update(id, { status: PolicyStatus.INACTIVE });
    await this.cacheManager.del(`policy:${id}`);
  }

  async getCategories() {
    return Object.values(PolicyCategory).map((cat) => ({
      value: cat,
      label: cat.charAt(0) + cat.slice(1).toLowerCase(),
    }));
  }

  async getInsurers() {
    return this.insurerRepository.find({ where: { isActive: true } });
  }

  async syncFromAdapters(): Promise<{ synced: number; errors: number }> {
    let synced = 0;
    let errors = 0;

    const insurers = await this.insurerRepository.find({ where: { isActive: true } });

    for (const insurer of insurers) {
      const adapter = this.adapterRegistry.getAdapter(insurer.adapterClass);
      if (!adapter) continue;

      try {
        const policies = await adapter.fetchPolicies();
        for (const policyData of policies) {
          await this.policyRepository.upsert(
            {
              insurerId: insurer.id,
              externalId: policyData.externalId,
              ...policyData,
            },
            ['externalId'],
          );
          synced++;
        }
      } catch (err) {
        this.logger.error(`Failed to sync from ${insurer.name}: ${err.message}`);
        errors++;
      }
    }

    await this.cacheManager.reset();
    return { synced, errors };
  }

  private hashFilter(dto: any): string {
    return crypto.createHash('md5').update(JSON.stringify(dto)).digest('hex');
  }
}
