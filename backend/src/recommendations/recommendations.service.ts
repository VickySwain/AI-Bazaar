import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { firstValueFrom, timeout, catchError } from 'rxjs';
import { of } from 'rxjs';
import { Recommendation } from './entities/recommendation.entity';
import { Policy, PolicyCategory, PolicyStatus } from '../policies/entities/policy.entity';
import { User } from '../users/entities/user.entity';
import { Purchase } from '../policies/entities/purchase.entity';
import { KafkaProducerService } from '../common/kafka/kafka-producer.service';
import { GetRecommendationsDto, TrackInteractionDto } from './dto/recommendation.dto';

interface ScoredPolicy {
  policy: Policy;
  score: number;
  reasons: string[];
  rank: number;
}

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);
  private readonly ML_MODEL_VERSION = 'v1.0.0';
  private readonly CACHE_TTL = 3600; // 1 hour

  constructor(
    @InjectRepository(Recommendation)
    private recommendationRepository: Repository<Recommendation>,
    @InjectRepository(Policy)
    private policyRepository: Repository<Policy>,
    @InjectRepository(Purchase)
    private purchaseRepository: Repository<Purchase>,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
    private httpService: HttpService,
    private configService: ConfigService,
    private kafkaProducer: KafkaProducerService,
  ) {}

  async getRecommendations(user: User, dto: GetRecommendationsDto): Promise<ScoredPolicy[]> {
    const limit = dto.limit || 5;
    const cacheKey = `recommendations:${user.id}:${dto.category || 'all'}:${limit}`;

    const cached = await this.cacheManager.get<ScoredPolicy[]>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for recommendations: ${user.id}`);
      return cached;
    }

    // Build user feature vector
    const features = await this.buildUserFeatures(user, dto);

    let scoredPolicies: ScoredPolicy[];

    // Try ML service first, fall back to rule-based engine
    try {
      scoredPolicies = await this.fetchFromMlService(features, dto.category, limit);
    } catch (err) {
      this.logger.warn(`ML service unavailable, using rule-based engine: ${err.message}`);
      scoredPolicies = await this.ruleBasedScoring(features, dto.category, limit);
    }

    // Persist recommendations
    await this.persistRecommendations(user.id, scoredPolicies);

    // Emit to Kafka
    await this.kafkaProducer.emit('recommendations.generated', {
      userId: user.id,
      count: scoredPolicies.length,
      category: dto.category,
      modelVersion: this.ML_MODEL_VERSION,
      timestamp: new Date().toISOString(),
    });

    await this.cacheManager.set(cacheKey, scoredPolicies, this.CACHE_TTL);
    return scoredPolicies;
  }

  private async buildUserFeatures(user: User, dto: GetRecommendationsDto) {
    const profile = user.profile;

    // Get purchase history for collaborative filtering
    const purchases = await this.purchaseRepository.find({
      where: { userId: user.id },
      relations: ['policy'],
      take: 10,
    });

    const purchasedCategories = purchases.map((p) => p.policy?.category).filter(Boolean);

    return {
      userId: user.id,
      age: dto.age || profile?.age || 30,
      gender: profile?.gender || 'MALE',
      incomeBracket: profile?.incomeBracket || 'SIX_TO_10L',
      cityTier: profile?.cityTier || 'TIER_2',
      isSmoker: profile?.isSmoker || false,
      hasDiabetes: profile?.hasDiabetes || false,
      hasHypertension: profile?.hasHypertension || false,
      hasHeartDisease: profile?.hasHeartDisease || false,
      familyMembers: profile?.familyMembers || 1,
      monthlyBudget: dto.budget || profile?.monthlyBudget || 2000,
      existingCoverage: profile?.existingCoverage || {},
      purchasedCategories,
      preferredCategory: dto.category,
    };
  }

  private async fetchFromMlService(
    features: any,
    category?: PolicyCategory,
    limit = 5,
  ): Promise<ScoredPolicy[]> {
    const mlUrl = this.configService.get<string>('ml.serviceUrl');
    const mlTimeout = this.configService.get<number>('ml.timeout');

    const response = await firstValueFrom(
      this.httpService
        .post(`${mlUrl}/recommend`, { features, category, limit })
        .pipe(
          timeout(mlTimeout),
          catchError((err) => {
            throw new Error(`ML service error: ${err.message}`);
          }),
        ),
    );

    const { recommendations } = response.data;

    // Fetch full policy objects for ML results
    const policyIds = recommendations.map((r: any) => r.policyId);
    const policies = await this.policyRepository.find({
  where: policyIds.map(id => ({ id })),
  relations: ['insurer'],
});
    const policyMap = new Map(policies.map((p) => [p.id, p]));

    return recommendations.map((r: any, index: number) => ({
      policy: policyMap.get(r.policyId),
      score: r.score,
      reasons: r.reasons || [],
      rank: index + 1,
    }));
  }

  private async ruleBasedScoring(
    features: any,
    category?: PolicyCategory,
    limit = 5,
  ): Promise<ScoredPolicy[]> {
    const query = this.policyRepository
      .createQueryBuilder('policy')
      .leftJoinAndSelect('policy.insurer', 'insurer')
      .where('policy.status = :status', { status: PolicyStatus.ACTIVE })
      .andWhere('policy.min_age <= :age', { age: features.age })
      .andWhere('policy.max_age >= :age', { age: features.age });

    if (category) {
      query.andWhere('policy.category = :category', { category });
    }

    const policies = await query.take(50).getMany();

    const scored = policies.map((policy) => {
      let score = 0;
      const reasons: string[] = [];

      // Budget fit (max 30 pts)
      const monthlyPremium = policy.basePremium / 12;
      const budgetRatio = monthlyPremium / features.monthlyBudget;
      if (budgetRatio <= 0.15) {
        score += 30;
        reasons.push('Fits your monthly budget');
      } else if (budgetRatio <= 0.25) {
        score += 20;
        reasons.push('Reasonably priced for your income');
      } else if (budgetRatio <= 0.4) {
        score += 10;
      }

      // Health conditions relevance (max 25 pts)
      if (policy.category === PolicyCategory.HEALTH) {
        if (features.hasDiabetes || features.hasHypertension) {
          score += 25;
          reasons.push('Covers pre-existing conditions');
        } else {
          score += 15;
        }
      }

      // Age relevance (max 20 pts)
      const ageFromMin = features.age - policy.minAge;
      const ageToMax = policy.maxAge - features.age;
      if (ageFromMin >= 5 && ageToMax >= 10) {
        score += 20;
        reasons.push('Ideal age for this policy');
      } else if (ageFromMin >= 0 && ageToMax >= 5) {
        score += 12;
      }

      // Popularity & rating (max 15 pts)
      score += Math.min(15, policy.popularityScore * 3);
      if (policy.avgRating >= 4.5) reasons.push('Highly rated by customers');

      // Family members (max 10 pts)
      if (features.familyMembers > 1 && policy.category === PolicyCategory.HEALTH) {
        score += 10;
        reasons.push('Suitable for family coverage');
      }

      // Category diversification bonus (max 10 pts)
      if (!features.purchasedCategories.includes(policy.category)) {
        score += 10;
        reasons.push('Fills a gap in your insurance coverage');
      }

      // Featured bonus
      if (policy.isFeatured) score += 5;

      return { policy, score, reasons, rank: 0 };
    });

    // Sort by score, assign ranks
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
  }

  private async persistRecommendations(userId: string, recommendations: ScoredPolicy[]) {
    const records = recommendations.map((r) =>
      this.recommendationRepository.create({
        userId,
        policyId: r.policy.id,
        score: r.score,
        rankPosition: r.rank,
        modelVersion: this.ML_MODEL_VERSION,
        recommendationContext: { reasons: r.reasons },
      }),
    );

    await this.recommendationRepository.save(records).catch((err) =>
      this.logger.warn(`Failed to persist recommendations: ${err.message}`),
    );
  }

  async trackInteraction(userId: string, dto: TrackInteractionDto) {
    const rec = await this.recommendationRepository.findOne({
      where: { id: dto.recommendationId, userId },
    });

    if (!rec) return;

    const update: Partial<Recommendation> = {};
    if (dto.action === 'click') update.wasClicked = true;
    if (dto.action === 'purchase') update.wasPurchased = true;

    await this.recommendationRepository.update(rec.id, update);

    await this.kafkaProducer.emit('recommendations.interaction', {
      userId,
      recommendationId: dto.recommendationId,
      action: dto.action,
      policyId: rec.policyId,
      timestamp: new Date().toISOString(),
    });
  }

  async getPersonalizedInsights(user: User) {
    const profile = user.profile;
    const insights: Array<{ type: string; title: string; description: string; priority: string }> = [];

    if (!profile?.age) {
      insights.push({
        type: 'ACTION',
        title: 'Complete your profile',
        description: 'Add your age and health details to get personalized recommendations.',
        priority: 'HIGH',
      });
    }

    if (profile?.age && profile.age < 30) {
      insights.push({
        type: 'TIP',
        title: 'Lock in low premiums now',
        description: 'Term insurance premiums are significantly cheaper when you\'re young. Buying now can save lakhs over your lifetime.',
        priority: 'HIGH',
      });
    }

    if (profile?.hasDiabetes || profile?.hasHypertension) {
      insights.push({
        type: 'ALERT',
        title: 'Pre-existing conditions coverage',
        description: 'Some health plans cover diabetes and hypertension after a waiting period. We\'ll highlight the best options.',
        priority: 'MEDIUM',
      });
    }

    if (profile?.familyMembers > 1) {
      insights.push({
        type: 'TIP',
        title: 'Family floater plan can save money',
        description: `A family floater health plan for ${profile.familyMembers} members is often cheaper than individual plans.`,
        priority: 'MEDIUM',
      });
    }

    // Check coverage gaps
    const purchases = await this.purchaseRepository.find({ where: { userId: user.id } });
    const coveredCategories = new Set(purchases.map((p) => p.policy?.category));

    const essentialCategories = [PolicyCategory.HEALTH, PolicyCategory.TERM];
    for (const cat of essentialCategories) {
      if (!coveredCategories.has(cat)) {
        insights.push({
          type: 'GAP',
          title: `No ${cat.toLowerCase()} insurance`,
          description: `You don't have ${cat.toLowerCase()} coverage. This is considered essential financial protection.`,
          priority: 'HIGH',
        });
      }
    }

    return insights;
  }
}
