// src/recommendations/ml-service.adapter.ts
// The NestJS-side client that calls the Python FastAPI ML service.
// Handles retries, timeouts, circuit-breaking, and the rule-based fallback.

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { firstValueFrom, timeout, retry, catchError } from 'rxjs';
import { of } from 'rxjs';
import * as crypto from 'crypto';

// ── Types shared between NestJS and FastAPI ───────────────────────────────
export interface MlUserFeatures {
  user_id: string;
  age: number;
  gender: string;
  income_bracket: string;
  city_tier: string;
  is_smoker: boolean;
  has_diabetes: boolean;
  has_hypertension: boolean;
  has_heart_disease: boolean;
  family_members: number;
  monthly_budget: number;
  purchased_categories: string[];
}

export interface MlRecommendRequest {
  features: MlUserFeatures;
  category?: string;
  limit?: number;
  exclude_policy_ids?: string[];
  context?: Record<string, any>;
}

export interface MlScoredPolicy {
  policy: {
    id: string;
    name: string;
    category: string;
    insurer_name: string;
    base_premium: number;
    sum_assured?: number;
    avg_rating: number;
    cashless_hospitals?: number;
    inclusions: string[];
    is_featured: boolean;
  };
  score: number;
  rank: number;
  reasons: string[];
  feature_contributions: Record<string, number>;
  model_version: string;
}

export interface MlRecommendResponse {
  user_id: string;
  recommendations: MlScoredPolicy[];
  model_version: string;
  generated_at: string;
  from_cache: boolean;
  fallback_used: boolean;
  inference_ms: number;
}

export interface MlInsightItem {
  type: 'ACTION' | 'TIP' | 'ALERT' | 'GAP';
  title: string;
  description: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface MlInsightsResponse {
  user_id: string;
  insights: MlInsightItem[];
  generated_at: string;
}

export interface MlHealthResponse {
  status: string;
  version: string;
  model_loaded: boolean;
  cache_connected: boolean;
  db_connected: boolean;
  uptime_seconds: number;
}

// ── Circuit Breaker state ─────────────────────────────────────────────────
enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing — reject all requests
  HALF_OPEN = 'HALF_OPEN', // Testing recovery
}

@Injectable()
export class MlServiceAdapter implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MlServiceAdapter.name);
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  // Circuit breaker state
  private circuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private readonly failureThreshold = 5;
  private readonly recoveryTimeMs = 30_000; // 30 seconds
  private lastFailureTime = 0;
  private circuitTimer: NodeJS.Timeout;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.baseUrl = this.configService.get<string>('ml.serviceUrl') || 'http://localhost:8000';
    this.timeoutMs = this.configService.get<number>('ml.timeout') || 5000;
    this.maxRetries = this.configService.get<number>('ml.maxRetries') || 2;
  }

  async onModuleInit() {
    // Warm-up ping to ML service
    try {
      await this.ping();
      this.logger.log(`ML service connected at ${this.baseUrl}`);
    } catch {
      this.logger.warn(`ML service unreachable at ${this.baseUrl} — fallback active`);
    }
  }

  async onModuleDestroy() {
    if (this.circuitTimer) clearTimeout(this.circuitTimer);
  }

  // ── Public API ────────────────────────────────────────────────────────────

  async getRecommendations(request: MlRecommendRequest): Promise<MlRecommendResponse | null> {
    if (!this.canRequest()) {
      this.logger.warn('Circuit breaker OPEN — ML service requests blocked');
      return null;
    }

    // Check NestJS-level cache (separate from ML service's own Redis cache)
    const cacheKey = this.buildCacheKey('rec', request);
    const cached = await this.cacheManager.get<MlRecommendResponse>(cacheKey);
    if (cached) {
      this.logger.debug(`NestJS cache hit for user ${request.features.user_id}`);
      return { ...cached, from_cache: true };
    }

    try {
      const response = await firstValueFrom(
        this.httpService
          .post<MlRecommendResponse>(`${this.baseUrl}/recommend`, request)
          .pipe(
            timeout(this.timeoutMs),
            retry({ count: this.maxRetries, delay: 500 }),
            catchError((err) => {
              this.recordFailure();
              throw err;
            }),
          ),
      );

      this.recordSuccess();
      const result = response.data;

      // Cache for 30 minutes (shorter than ML service's 1hr to account for staleness)
      await this.cacheManager.set(cacheKey, result, 1800);
      return result;

    } catch (err) {
      this.logger.error(
        `ML service error for user ${request.features.user_id}: ${err.message}`,
      );
      return null;
    }
  }

  async getInsights(features: MlUserFeatures): Promise<MlInsightsResponse | null> {
    if (!this.canRequest()) return null;

    const cacheKey = `ml:insights:${features.user_id}`;
    const cached = await this.cacheManager.get<MlInsightsResponse>(cacheKey);
    if (cached) return cached;

    try {
      const response = await firstValueFrom(
        this.httpService
          .post<MlInsightsResponse>(`${this.baseUrl}/recommend/insights`, features)
          .pipe(timeout(this.timeoutMs)),
      );
      await this.cacheManager.set(cacheKey, response.data, 1800);
      return response.data;
    } catch (err) {
      this.logger.warn(`ML insights failed: ${err.message}`);
      return null;
    }
  }

  async trackInteraction(event: {
    user_id: string;
    policy_id: string;
    action: string;
    recommendation_id?: string;
    session_id?: string;
  }): Promise<void> {
    // Fire-and-forget — interaction tracking must never block user flow
    this.httpService
      .post(`${this.baseUrl}/interactions`, event)
      .pipe(timeout(2000))
      .subscribe({
        error: (err) => this.logger.debug(`Interaction tracking failed: ${err.message}`),
      });
  }

  async ping(): Promise<MlHealthResponse> {
    const response = await firstValueFrom(
      this.httpService
        .get<MlHealthResponse>(`${this.baseUrl}/health`)
        .pipe(timeout(3000)),
    );
    return response.data;
  }

  async getModelInfo(): Promise<Record<string, any> | null> {
    try {
      const response = await firstValueFrom(
        this.httpService
          .get(`${this.baseUrl}/training/model`)
          .pipe(timeout(3000)),
      );
      return response.data;
    } catch {
      return null;
    }
  }

  async invalidateUserCache(userId: string): Promise<void> {
    // Notify ML service to clear its Redis cache for this user
    try {
      await firstValueFrom(
        this.httpService
          .post(`${this.baseUrl}/interactions`, {
            user_id: userId,
            policy_id: '__cache_invalidation__',
            action: 'purchase',
          })
          .pipe(timeout(2000)),
      );
    } catch {
      // Non-fatal
    }
    // Also clear NestJS-level cache
    const keys = [`ml:rec:${userId}:*`, `ml:insights:${userId}`];
    for (const key of keys) {
      await this.cacheManager.del(key).catch(() => {});
    }
  }

  // ── Circuit Breaker ───────────────────────────────────────────────────────

  private canRequest(): boolean {
    if (this.circuitState === CircuitState.CLOSED) return true;
    if (this.circuitState === CircuitState.HALF_OPEN) return true;

    // OPEN state: check if recovery window has passed
    if (Date.now() - this.lastFailureTime > this.recoveryTimeMs) {
      this.circuitState = CircuitState.HALF_OPEN;
      this.logger.log('Circuit breaker → HALF_OPEN (testing recovery)');
      return true;
    }
    return false;
  }

  private recordFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold && this.circuitState === CircuitState.CLOSED) {
      this.circuitState = CircuitState.OPEN;
      this.logger.warn(
        `Circuit breaker OPEN after ${this.failureCount} failures. ` +
        `Recovery in ${this.recoveryTimeMs / 1000}s`,
      );
    }
  }

  private recordSuccess() {
    if (this.circuitState === CircuitState.HALF_OPEN) {
      this.circuitState = CircuitState.CLOSED;
      this.failureCount = 0;
      this.logger.log('Circuit breaker → CLOSED (ML service recovered)');
    }
  }

  private buildCacheKey(prefix: string, request: MlRecommendRequest): string {
    const stable = JSON.stringify({
      userId: request.features.user_id,
      category: request.category,
      limit: request.limit,
    });
    return `ml:${prefix}:${crypto.createHash('md5').update(stable).digest('hex')}`;
  }

  get circuitStatus(): string {
    return this.circuitState;
  }
}
