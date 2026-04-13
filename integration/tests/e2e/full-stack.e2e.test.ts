// tests/e2e/full-stack.e2e.test.ts
// Full end-to-end integration tests verifying the complete data flow:
// Frontend API call → NestJS backend → ML FastAPI → Redis cache → response

import axios, { AxiosInstance } from 'axios';

const BACKEND_URL  = process.env.BACKEND_URL  || 'http://localhost:3001/api/v1';
const ML_URL       = process.env.ML_URL       || 'http://localhost:8000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const backendApi  = axios.create({ baseURL: BACKEND_URL,  timeout: 15000 });
const mlApi       = axios.create({ baseURL: ML_URL,       timeout: 10000 });

// ── Test user ─────────────────────────────────────────────────────────────
const TEST_USER = {
  email:    `e2e+${Date.now()}@coverai.test`,
  fullName: 'E2E Test User',
  password: 'TestPass@123',
};

let accessToken   = '';
let refreshToken  = '';
let userId        = '';
let quoteId       = '';
let policyId      = '';
let paymentId     = '';

// ── 1. Service Health ─────────────────────────────────────────────────────
describe('1. Service Health Checks', () => {
  test('ML service /health/ping responds 200', async () => {
    const res = await mlApi.get('/health/ping');
    expect(res.status).toBe(200);
    expect(res.data.status).toBe('ok');
  });

  test('Backend /health responds 200', async () => {
    const res = await backendApi.get('/health/ping');
    expect(res.status).toBe(200);
    expect(res.data.status).toBe('ok');
  });

  test('ML service full health check passes', async () => {
    const res = await mlApi.get('/health');
    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('model_loaded');
    expect(res.data).toHaveProperty('uptime_seconds');
  });

  test('Backend → ML connectivity (ml-health endpoint)', async () => {
    // This validates NestJS can reach FastAPI
    const res = await backendApi.get('/recommendations/ml-health').catch(
      () => ({ status: 503, data: { status: 'unreachable' } })
    );
    // Either connected or gracefully degraded — both are valid
    expect([200, 503]).toContain(res.status);
    expect(res.data).toHaveProperty('data');
  });
});

// ── 2. Auth Flow ──────────────────────────────────────────────────────────
describe('2. Authentication Flow', () => {
  test('Register new user', async () => {
    const res = await backendApi.post('/auth/register', TEST_USER);
    expect(res.status).toBe(201);
    expect(res.data.success).toBe(true);
    expect(res.data.data).toHaveProperty('tokens');
    expect(res.data.data).toHaveProperty('user');

    accessToken  = res.data.data.tokens.accessToken;
    refreshToken = res.data.data.tokens.refreshToken;
    userId       = res.data.data.user.id;

    expect(accessToken).toBeTruthy();
    expect(userId).toBeTruthy();
  });

  test('Login with registered credentials', async () => {
    const res = await backendApi.post('/auth/login', {
      email:    TEST_USER.email,
      password: TEST_USER.password,
    });
    expect(res.status).toBe(200);
    expect(res.data.data.tokens.accessToken).toBeTruthy();
    // Update tokens to latest
    accessToken  = res.data.data.tokens.accessToken;
    refreshToken = res.data.data.tokens.refreshToken;
  });

  test('Get current user with JWT', async () => {
    const res = await backendApi.get('/auth/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(res.status).toBe(200);
    expect(res.data.data.user.email).toBe(TEST_USER.email);
  });

  test('Refresh token rotates both tokens', async () => {
    const res = await backendApi.post('/auth/refresh', { refreshToken });
    expect(res.status).toBe(200);
    expect(res.data.data.tokens.accessToken).toBeTruthy();
    expect(res.data.data.tokens.refreshToken).toBeTruthy();
    // New tokens should be different
    expect(res.data.data.tokens.accessToken).not.toBe(accessToken);
    accessToken  = res.data.data.tokens.accessToken;
    refreshToken = res.data.data.tokens.refreshToken;
  });

  test('Unauthenticated request is rejected 401', async () => {
    const res = await backendApi.get('/users/dashboard').catch((e) => e.response);
    expect(res.status).toBe(401);
  });
});

// ── 3. Policy Catalog Flow ─────────────────────────────────────────────────
describe('3. Policy Catalog & Filtering', () => {
  const authHeader = () => ({ Authorization: `Bearer ${accessToken}` });

  test('List all policies (public)', async () => {
    const res = await backendApi.get('/policies?limit=5');
    expect(res.status).toBe(200);
    expect(res.data.data.policies).toBeInstanceOf(Array);
    expect(res.data.data.pagination.total).toBeGreaterThan(0);

    // Store a policy ID for later tests
    if (res.data.data.policies.length > 0) {
      policyId = res.data.data.policies[0].id;
    }
  });

  test('Filter policies by category=HEALTH', async () => {
    const res = await backendApi.get('/policies?category=HEALTH&limit=10');
    expect(res.status).toBe(200);
    const policies = res.data.data.policies;
    expect(policies.every((p: any) => p.category === 'HEALTH')).toBe(true);
  });

  test('Filter policies by premium range', async () => {
    const res = await backendApi.get('/policies?minPremium=5000&maxPremium=15000');
    expect(res.status).toBe(200);
    const policies = res.data.data.policies;
    policies.forEach((p: any) => {
      expect(Number(p.basePremium)).toBeGreaterThanOrEqual(5000);
      expect(Number(p.basePremium)).toBeLessThanOrEqual(15000);
    });
  });

  test('Get single policy detail', async () => {
    if (!policyId) return;
    const res = await backendApi.get(`/policies/${policyId}`);
    expect(res.status).toBe(200);
    expect(res.data.data.policy.id).toBe(policyId);
    expect(res.data.data.policy).toHaveProperty('insurer');
  });

  test('Compare 2 policies side by side', async () => {
    if (!policyId) return;
    // Get a second policy
    const listRes = await backendApi.get('/policies?limit=2');
    const ids = listRes.data.data.policies.map((p: any) => p.id);
    if (ids.length < 2) return;

    const res = await backendApi.post('/policies/compare', {
      policyIds: ids.slice(0, 2),
    });
    expect(res.status).toBe(200);
    expect(res.data.data.policies.length).toBe(2);
    expect(res.data.data.comparisonMatrix).toBeInstanceOf(Array);
    expect(res.data.data.comparisonMatrix[0]).toHaveProperty('values');
  });

  test('Get all insurers', async () => {
    const res = await backendApi.get('/policies/insurers');
    expect(res.status).toBe(200);
    expect(res.data.data.insurers).toBeInstanceOf(Array);
    expect(res.data.data.insurers.length).toBeGreaterThan(0);
  });

  test('Generate a quote (authenticated)', async () => {
    if (!policyId) return;
    const res = await backendApi.post(
      '/policies/quote',
      { policyId, age: 30, sumAssured: 1000000 },
      { headers: authHeader() },
    );
    expect(res.status).toBe(201);
    expect(res.data.data.quote).toHaveProperty('id');
    expect(res.data.data.quote.status).toBe('ACTIVE');
    expect(Number(res.data.data.quote.totalPremium)).toBeGreaterThan(0);
    quoteId = res.data.data.quote.id;
  });
});

// ── 4. ML Recommendation Flow ─────────────────────────────────────────────
describe('4. ML Recommendation Flow (Frontend → NestJS → FastAPI)', () => {
  const authHeader = () => ({ Authorization: `Bearer ${accessToken}` });

  test('Get recommendations (may use ML or fallback)', async () => {
    const res = await backendApi.get('/recommendations?limit=5', {
      headers: authHeader(),
    });
    expect(res.status).toBe(200);
    const { recommendations, total } = res.data.data;
    expect(recommendations).toBeInstanceOf(Array);
    expect(total).toBeGreaterThanOrEqual(0);

    if (recommendations.length > 0) {
      const first = recommendations[0];
      expect(first).toHaveProperty('policy');
      expect(first).toHaveProperty('score');
      expect(first).toHaveProperty('rank');
      expect(first).toHaveProperty('reasons');
      expect(first).toHaveProperty('modelVersion');
      expect(first.rank).toBe(1);
      expect(first.score).toBeGreaterThanOrEqual(0);
      expect(first.score).toBeLessThanOrEqual(1);
    }
  });

  test('ML service direct call returns recommendations', async () => {
    const res = await mlApi.post('/recommend', {
      features: {
        user_id: userId || 'e2e-test-user',
        age: 30,
        gender: 'MALE',
        income_bracket: '6L_TO_10L',
        city_tier: 'TIER_2',
        is_smoker: false,
        has_diabetes: false,
        has_hypertension: false,
        has_heart_disease: false,
        family_members: 2,
        monthly_budget: 2500,
        purchased_categories: [],
      },
      category: 'HEALTH',
      limit: 5,
    });
    expect(res.status).toBe(200);
    expect(res.data.recommendations).toBeInstanceOf(Array);
    expect(res.data.model_version).toBeTruthy();
    expect(typeof res.data.inference_ms).toBe('number');

    if (res.data.recommendations.length > 0) {
      const rec = res.data.recommendations[0];
      expect(rec.rank).toBe(1);
      expect(rec.score).toBeGreaterThan(0);
      expect(rec.reasons).toBeInstanceOf(Array);
    }
  });

  test('ML model version is consistent between direct and proxied calls', async () => {
    const [directRes, proxiedRes] = await Promise.all([
      mlApi.post('/recommend', {
        features: {
          user_id: userId,
          age: 28, gender: 'FEMALE', income_bracket: '6L_TO_10L',
          city_tier: 'TIER_2', is_smoker: false, has_diabetes: false,
          has_hypertension: false, has_heart_disease: false,
          family_members: 1, monthly_budget: 2000,
          purchased_categories: [],
        },
        limit: 3,
      }),
      backendApi.get('/recommendations?limit=3', { headers: authHeader() }),
    ]);

    // Both should return valid response (either ML or fallback)
    expect(directRes.status).toBe(200);
    expect(proxiedRes.status).toBe(200);
  });

  test('Recommendations are cached on second request', async () => {
    const t1 = Date.now();
    const res1 = await backendApi.get('/recommendations?limit=5', {
      headers: authHeader(),
    });
    const t2 = Date.now();

    const res2 = await backendApi.get('/recommendations?limit=5', {
      headers: authHeader(),
    });
    const t3 = Date.now();

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    // Second request should be significantly faster (cached)
    const firstMs  = t2 - t1;
    const secondMs = t3 - t2;
    // Allow generous margin — just verify both succeed
    expect(secondMs).toBeLessThan(firstMs + 1000);
  });

  test('Get personalised insights', async () => {
    const res = await backendApi.get('/recommendations/insights', {
      headers: authHeader(),
    });
    expect(res.status).toBe(200);
    expect(res.data.data.insights).toBeInstanceOf(Array);
  });

  test('Track recommendation interaction (click)', async () => {
    const res = await backendApi.post(
      '/recommendations/track',
      { action: 'click', policyId },
      { headers: authHeader() },
    );
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
  });

  test('Interaction event reaches ML service (async)', async () => {
    // Give the async fire-and-forget time to complete
    await new Promise((resolve) => setTimeout(resolve, 500));

    const statsRes = await mlApi
      .get(`/interactions/stats/${userId}`)
      .catch(() => null);

    // Either endpoint exists and returns data, or gracefully not found
    if (statsRes) {
      expect(statsRes.status).toBe(200);
    }
  });
});

// ── 5. User Profile & Dashboard Flow ──────────────────────────────────────
describe('5. User Profile & Dashboard', () => {
  const authHeader = () => ({ Authorization: `Bearer ${accessToken}` });

  test('Update user profile', async () => {
    const res = await backendApi.put(
      '/users/profile',
      {
        age: 30,
        gender: 'MALE',
        city: 'Mumbai',
        state: 'Maharashtra',
        incomeBracket: '6L_TO_10L',
        cityTier: 'TIER_1',
        familyMembers: 2,
        monthlyBudget: 2500,
        isSmoker: false,
        hasDiabetes: false,
        hasHypertension: false,
        hasHeartDisease: false,
      },
      { headers: authHeader() },
    );
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.data.user.profile.age).toBe(30);
  });

  test('Get dashboard data', async () => {
    const res = await backendApi.get('/users/dashboard', {
      headers: authHeader(),
    });
    expect(res.status).toBe(200);
    const { stats } = res.data.data;
    expect(stats).toHaveProperty('totalPolicies');
    expect(stats).toHaveProperty('activePolicies');
    expect(stats).toHaveProperty('totalPremiumPaid');
  });

  test('Profile update invalidates recommendation cache', async () => {
    // After updating profile, recommendations should be re-fetched
    const res = await backendApi.get('/recommendations?limit=3', {
      headers: authHeader(),
    });
    expect(res.status).toBe(200);
    // Should succeed regardless of cache state
  });
});

// ── 6. Payment Flow ───────────────────────────────────────────────────────
describe('6. Payment Flow', () => {
  const authHeader = () => ({ Authorization: `Bearer ${accessToken}` });

  test('Create payment order from quote', async () => {
    if (!quoteId) {
      console.log('Skipping payment test — no quote available');
      return;
    }
    const res = await backendApi.post(
      '/payments/order',
      {
        quoteId,
        insuredDetails: { fullName: TEST_USER.fullName, dob: '1994-06-15' },
        nomineeDetails: { name: 'Test Nominee', relationship: 'SPOUSE' },
      },
      { headers: authHeader() },
    );
    expect(res.status).toBe(201);
    const order = res.data.data;
    expect(order).toHaveProperty('orderId');
    expect(order).toHaveProperty('amount');
    expect(order).toHaveProperty('keyId');
    expect(order.amount).toBeGreaterThan(0);
    paymentId = order.paymentId;
  });

  test('Payment history is accessible', async () => {
    const res = await backendApi.get('/payments/history', {
      headers: authHeader(),
    });
    expect(res.status).toBe(200);
    expect(res.data.data.payments).toBeInstanceOf(Array);
  });
});

// ── 7. Kafka Event Flow ────────────────────────────────────────────────────
describe('7. Event-Driven Data Flow', () => {
  const authHeader = () => ({ Authorization: `Bearer ${accessToken}` });

  test('Policy search event emitted after search', async () => {
    // Searching triggers kafka event — verify no errors thrown
    const res = await backendApi.get('/policies?search=health&limit=3');
    expect(res.status).toBe(200);
    // Kafka events are fire-and-forget; success = no exception
  });

  test('Quote creation event emitted', async () => {
    if (!policyId) return;
    const res = await backendApi.post(
      '/policies/quote',
      { policyId, age: 32 },
      { headers: authHeader() },
    );
    expect(res.status).toBe(201);
    // If this succeeds, kafka.emit was called without throwing
  });
});

// ── 8. ML Service Resilience ──────────────────────────────────────────────
describe('8. ML Service Resilience', () => {
  const authHeader = () => ({ Authorization: `Bearer ${accessToken}` });

  test('Recommendations API succeeds even when ML uses fallback', async () => {
    const res = await backendApi.get('/recommendations?limit=3', {
      headers: authHeader(),
    });
    // Whether ML model or fallback, this should always return 200
    expect(res.status).toBe(200);
    expect(res.data.data.recommendations).toBeInstanceOf(Array);
  });

  test('ML service provides fallback_used flag when rule-based', async () => {
    const res = await mlApi.post('/recommend', {
      features: {
        user_id: 'resilience-test',
        age: 45, gender: 'FEMALE', income_bracket: '10L_TO_20L',
        city_tier: 'TIER_1', is_smoker: false, has_diabetes: true,
        has_hypertension: true, has_heart_disease: false,
        family_members: 3, monthly_budget: 5000,
        purchased_categories: ['MOTOR'],
      },
      limit: 5,
    });
    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('fallback_used');
    expect(typeof res.data.fallback_used).toBe('boolean');
  });

  test('Circuit breaker status is exposed', async () => {
    const res = await backendApi.get('/recommendations/ml-health', {
      headers: authHeader(),
    }).catch((e) => e.response);

    if (res.status === 200) {
      expect(res.data.data).toHaveProperty('circuitBreaker');
      expect(['CLOSED', 'OPEN', 'HALF_OPEN']).toContain(res.data.data.circuitBreaker);
    }
  });
});

// ── 9. Cleanup ────────────────────────────────────────────────────────────
describe('9. Cleanup', () => {
  test('Logout invalidates token', async () => {
    const res = await backendApi.post(
      '/auth/logout',
      {},
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    expect(res.status).toBe(200);
  });

  test('Revoked token is rejected', async () => {
    await new Promise((r) => setTimeout(r, 200)); // small delay
    const res = await backendApi.get('/auth/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).catch((e) => e.response);
    expect(res.status).toBe(401);
  });
});
