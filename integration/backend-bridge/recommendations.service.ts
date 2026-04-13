// src/recommendations/recommendations.service.ts
// Full integration: profile → feature vector → ML service → fallback → cache → response

import {
  Injectable,
  Logger,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

import { Recommendation } from './entities/recommendation.entity';
import { Policy, PolicyCategory, PolicyStatus } from '../policies/entities/policy.entity';
import { Purchase } from '../policies/entities/purchase.entity';
import { User } from '../users/entities/user.entity';
import { KafkaProducerService } from '../common/kafka/kafka-producer.service';
import {
  MlServiceAdapter,
  MlUserFeatures,
  MlScoredPolicy,
} from './ml-service.adapter';
import { GetRecommendationsDto, TrackInteractionDto } from './dto/recommendation.dto';

export interface ScoredRecommendation {
  policy: Policy;
  score: number;
  rank: number;
  reasons: string[];
  modelVersion: string;
  featureContributions?: Record<string, number>;
}

const MODEL_VERSION = 'v1.0.0';

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);
  private readonly CACHE_TTL = 3600; // 1 hour

  constructor(
    @InjectRepository(Recommendation)
    private recommendationRepository: Repository<Recommendation>,
    @InjectRepository(Policy)
    private policyRepository: Repository<Policy>,
    @InjectRepository(Purchase)
    private purchaseRepository: Repository<Purchase>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private mlAdapter: MlServiceAdapter,
    private kafkaProducer: KafkaProducerService,
    private configService: ConfigService,
  ) {}

  // ── Main Recommendation Flow ──────────────────────────────────────────────

  async getRecommendations(
    user: User,
    dto: GetRecommendationsDto,
  ): Promise<ScoredRecommendation[]> {
    const category = dto.category as PolicyCategory | undefined;
    const limit = Math.min(dto.limit || 5, 20);

    // 1. Build ML feature vector from user profile
    const features = await this.buildUserFeatures(user);

    // 2. Try ML service
    const mlResponse = await this.mlAdapter.getRecommendations({
      features,
      category,
      limit,
      exclude_policy_ids: [],
      context: { source: 'nestjs-api' },
    });

    let recommendations: ScoredRecommendation[];
    let fallbackUsed = false;

    if (mlResponse && mlResponse.recommendations.length > 0) {
      // 3a. ML service responded — enrich with full DB policy data
      recommendations = await this.enrichMlRecommendations(
        mlResponse.recommendations,
        user,
      );
      this.logger.log(
        `ML recommendations for ${user.id}: ${recommendations.length} items ` +
        `(v${mlResponse.model_version}, ${mlResponse.inference_ms?.toFixed(0)}ms, ` +
        `fallback=${mlResponse.fallback_used})`,
      );
    } else {
      // 3b. ML service unavailable → rule-based fallback from NestJS
      this.logger.warn(`ML service unavailable for user ${user.id} — using NestJS fallback`);
      recommendations = await this.ruleBasedFallback(user, category, limit);
      fallbackUsed = true;
    }

    // 4. Persist recommendations for analytics + feedback loop
    await this.persistRecommendations(user.id, recommendations, fallbackUsed);

    // 5. Emit Kafka event
    await this.kafkaProducer.emit('recommendations.generated', {
      userId: user.id,
      count: recommendations.length,
      category: category || 'all',
      modelVersion: mlResponse?.model_version || `rule-based-fallback`,
      fallbackUsed,
      timestamp: new Date().toISOString(),
    });

    return recommendations;
  }

  // ── Feature Vector Construction ───────────────────────────────────────────

  private async buildUserFeatures(user: User): Promise<MlUserFeatures> {
    const profile = user.profile;

    // Get purchased categories from DB
    const purchases = await this.purchaseRepository.find({
      where: { userId: user.id, status: 'ACTIVE' as any },
      relations: ['policy'],
    });
    const purchasedCategories = [
      ...new Set(purchases.map((p) => p.policy?.category).filter(Boolean)),
    ];

    return {
      user_id: user.id,
      age: profile?.age || 30,
      gender: profile?.gender || 'OTHER',
      income_bracket: profile?.incomeBracket || '6L_TO_10L',
      city_tier: profile?.cityTier || 'TIER_2',
      is_smoker: profile?.isSmoker || false,
      has_diabetes: profile?.hasDiabetes || false,
      has_hypertension: profile?.hasHypertension || false,
      has_heart_disease: profile?.hasHeartDisease || false,
      family_members: profile?.familyMembers || 1,
      monthly_budget: Number(profile?.monthlyBudget) || 2000,
      purchased_categories: purchasedCategories,
    };
  }

  // ── ML Response Enrichment ────────────────────────────────────────────────

  private async enrichMlRecommendations(
    mlPolicies: MlScoredPolicy[],
    user: User,
  ): Promise<ScoredRecommendation[]> {
    // ML service returns seed-data policy IDs; we join with full DB records
    const policyIds = mlPolicies.map((r) => r.policy.id);

    const dbPolicies = await this.policyRepository.find({
      where: policyIds.map((id) => ({ id, status: PolicyStatus.ACTIVE })) as any,
      relations: ['insurer'],
    });

    const policyMap = new Map(dbPolicies.map((p) => [p.id, p]));

    return mlPolicies
      .map((mlPol, index) => {
        const dbPolicy = policyMap.get(mlPol.policy.id);
        if (!dbPolicy) {
          // Policy in ML response not found in DB — use ML data directly
          this.logger.debug(`Policy ${mlPol.policy.id} not in DB, using ML seed data`);
        }

        const policy = dbPolicy || this.mlPolicyToEntity(mlPol);

        return {
          policy,
          score: mlPol.score,
          rank: mlPol.rank,
          reasons: mlPol.reasons,
          modelVersion: mlPol.model_version,
          featureContributions: mlPol.feature_contributions,
        };
      })
      .filter(Boolean);
  }

  // ── NestJS Rule-Based Fallback ────────────────────────────────────────────
  // Mirrors the Python rule-based scorer but runs in NestJS when ML is down.

  private async ruleBasedFallback(
    user: User,
    category?: PolicyCategory,
    limit = 5,
  ): Promise<ScoredRecommendation[]> {
    const profile = user.profile;
    const age = profile?.age || 30;
    const monthlyBudget = Number(profile?.monthlyBudget) || 2000;

    const purchases = await this.purchaseRepository.find({
      where: { userId: user.id },
      relations: ['policy'],
    });
    const purchasedCats = new Set(purchases.map((p) => p.policy?.category).filter(Boolean));

    const queryBuilder = this.policyRepository
      .createQueryBuilder('policy')
      .leftJoinAndSelect('policy.insurer', 'insurer')
      .where('policy.status = :status', { status: PolicyStatus.ACTIVE })
      .andWhere('policy.min_age <= :age', { age })
      .andWhere('policy.max_age >= :age', { age });

    if (category) {
      queryBuilder.andWhere('policy.category = :category', { category });
    }

    const policies = await queryBuilder.take(50).getMany();

    const scored = policies.map((policy) => {
      let score = 0;
      const reasons: string[] = [];
      const monthlyPremium = Number(policy.basePremium) / 12;
      const budgetRatio = monthlyPremium / Math.max(monthlyBudget, 1);

      // Budget fit (30%)
      if (budgetRatio <= 0.15) { score += 0.30; reasons.push('Fits within your monthly budget'); }
      else if (budgetRatio <= 0.25) { score += 0.20; reasons.push('Reasonably priced for your income'); }
      else if (budgetRatio > 0.6) { score -= 0.15; }

      // Coverage gap (15%)
      if (!purchasedCats.has(policy.category)) {
        score += 0.15;
        reasons.push(`Fills a gap — no ${policy.category.toLowerCase()} coverage yet`);
      }

      // Health relevance (20%)
      const healthFlags = [
        profile?.isSmoker, profile?.hasDiabetes,
        profile?.hasHypertension, profile?.hasHeartDisease,
      ].filter(Boolean).length;

      if (policy.category === PolicyCategory.HEALTH && healthFlags > 0) {
        score += 0.20;
        reasons.push('Covers your pre-existing conditions');
      } else if (policy.category === PolicyCategory.HEALTH) {
        score += 0.10;
      }

      // Popularity (15%)
      const popScore = Math.min(0.15, (Number(policy.popularityScore) / 10) * 0.15);
      score += popScore;
      if (Number(policy.avgRating) >= 4.5) reasons.push(`${policy.avgRating}★ customer rating`);

      // Family (10%)
      if ((profile?.familyMembers || 1) > 1 && policy.category === PolicyCategory.HEALTH) {
        score += 0.10;
        reasons.push('Suitable for family coverage');
      }

      // Featured (5%)
      if (policy.isFeatured) score += 0.05;

      return { policy, score: Math.max(0, Math.min(1, score)), reasons };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item, i) => ({
        ...item,
        rank: i + 1,
        modelVersion: 'nestjs-rule-based-v1',
      }));
  }

  // ── Insights ──────────────────────────────────────────────────────────────

  async getPersonalizedInsights(user: User) {
    const features = await this.buildUserFeatures(user);
    const mlInsights = await this.mlAdapter.getInsights(features);
    if (mlInsights) return mlInsights.insights;

    // Fallback insights from NestJS
    return this.generateFallbackInsights(user, features);
  }

  private async generateFallbackInsights(user: User, features: MlUserFeatures) {
    const insights = [];
    const { age, purchased_categories: purchased } = features;

    if (age <= 30) {
      insights.push({
        type: 'TIP',
        title: 'Lock in low premiums now',
        description: 'Term insurance premiums at 25 can be 60% cheaper than at 40.',
        priority: 'HIGH',
      });
    }

    const essentialGaps = [
      ['HEALTH', 'health'],
      ['TERM', 'term life'],
    ];
    for (const [cat, label] of essentialGaps) {
      if (!purchased.includes(cat)) {
        insights.push({
          type: 'GAP',
          title: `No ${label} insurance`,
          description: `You currently have no ${label} coverage — considered essential protection.`,
          priority: 'HIGH',
        });
      }
    }

    return insights;
  }

  // ── Interaction Tracking ──────────────────────────────────────────────────

  async trackInteraction(userId: string, dto: TrackInteractionDto): Promise<void> {
    const rec = await this.recommendationRepository.findOne({
      where: { id: dto.recommendationId, userId },
    });

    if (rec) {
      const update: Partial<Recommendation> = {};
      if (dto.action === 'click')    update.wasClicked   = true;
      if (dto.action === 'purchase') update.wasPurchased = true;
      await this.recommendationRepository.update(rec.id, update);
    }

    // Forward to ML service for model feedback loop (async, non-blocking)
    this.mlAdapter.trackInteraction({
      user_id: userId,
      policy_id: dto.policyId || rec?.policyId || '',
      action: dto.action,
      recommendation_id: dto.recommendationId,
    });

    await this.kafkaProducer.emit('recommendations.interaction', {
      userId,
      recommendationId: dto.recommendationId,
      action: dto.action,
      timestamp: new Date().toISOString(),
    });
  }

  // ── Persist Recommendations ───────────────────────────────────────────────

  private async persistRecommendations(
    userId: string,
    recommendations: ScoredRecommendation[],
    fallbackUsed: boolean,
  ): Promise<void> {
    try {
      const records = recommendations.map((r) =>
        this.recommendationRepository.create({
          userId,
          policyId: r.policy.id,
          score: r.score,
          rankPosition: r.rank,
          modelVersion: r.modelVersion,
          recommendationContext: {
            reasons: r.reasons,
            featureContributions: r.featureContributions,
            fallbackUsed,
          },
        }),
      );
      await this.recommendationRepository.save(records);
    } catch (err) {
      this.logger.warn(`Failed to persist recommendations: ${err.message}`);
    }
  }

  // ── ML health ─────────────────────────────────────────────────────────────

  async getMlServiceHealth() {
    try {
      const health = await this.mlAdapter.ping();
      const modelInfo = await this.mlAdapter.getModelInfo();
      return {
        status: health.status,
        modelLoaded: health.model_loaded,
        modelVersion: modelInfo?.version,
        circuitBreaker: this.mlAdapter.circuitStatus,
        uptime: health.uptime_seconds,
      };
    } catch {
      return {
        status: 'unreachable',
        modelLoaded: false,
        circuitBreaker: this.mlAdapter.circuitStatus,
      };
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private mlPolicyToEntity(mlPol: MlScoredPolicy): Partial<Policy> {
    return {
      id: mlPol.policy.id,
      name: mlPol.policy.name,
      category: mlPol.policy.category as PolicyCategory,
      basePremium: mlPol.policy.base_premium,
      sumAssured: mlPol.policy.sum_assured,
      avgRating: mlPol.policy.avg_rating,
      isFeatured: mlPol.policy.is_featured,
      inclusions: mlPol.policy.inclusions,
    } as any;
  }
}
