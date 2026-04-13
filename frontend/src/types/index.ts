// ── Auth ──────────────────────────────────────────────────────────────────
export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface AuthUser {
  id: string
  email: string
  fullName: string
  phone?: string
  role: 'USER' | 'AGENT' | 'ADMIN'
  isEmailVerified: boolean
  lastLoginAt?: string
  createdAt: string
  profile?: UserProfile
}

// ── User Profile ──────────────────────────────────────────────────────────
export interface UserProfile {
  id: string
  userId: string
  age?: number
  gender?: 'MALE' | 'FEMALE' | 'OTHER'
  city?: string
  state?: string
  pincode?: string
  cityTier?: 'TIER_1' | 'TIER_2' | 'TIER_3'
  incomeBracket?: IncomeBracket
  isSmoker: boolean
  hasDiabetes: boolean
  hasHypertension: boolean
  hasHeartDisease: boolean
  familyMembers: number
  monthlyBudget?: number
  existingCoverage?: Record<string, any>
  preferences?: Record<string, any>
  kycVerified: boolean
  avatarUrl?: string
}

export type IncomeBracket =
  | 'BELOW_3L'
  | '3L_TO_6L'
  | '6L_TO_10L'
  | '10L_TO_20L'
  | 'ABOVE_20L'

// ── Policy ────────────────────────────────────────────────────────────────
export type PolicyCategory = 'HEALTH' | 'LIFE' | 'TERM' | 'MOTOR' | 'TRAVEL' | 'HOME'

export interface Insurer {
  id: string
  name: string
  slug: string
  logoUrl?: string
  claimSettlementRatio?: number
  establishedYear?: number
  isActive: boolean
}

export interface Policy {
  id: string
  insurerId: string
  insurer: Insurer
  name: string
  description?: string
  category: PolicyCategory
  basePremium: number
  sumAssured?: number
  minAge: number
  maxAge: number
  policyTermYears?: number
  waitingPeriodDays: number
  cashlessHospitals?: number
  coPaymentPercent: number
  coverageDetails?: Record<string, any>
  inclusions?: string[]
  exclusions?: string[]
  riders?: Array<{ name: string; premium: number; description: string }>
  isFeatured: boolean
  popularityScore: number
  avgRating: number
  totalReviews: number
  status: 'ACTIVE' | 'INACTIVE'
  createdAt: string
}

export interface Quote {
  id: string
  userId: string
  policyId: string
  policy: Policy
  quotedPremium: number
  annualPremium: number
  gstAmount: number
  totalPremium: number
  parameters?: Record<string, any>
  status: 'ACTIVE' | 'EXPIRED' | 'PURCHASED' | 'CANCELLED'
  expiresAt: string
  createdAt: string
}

export interface Purchase {
  id: string
  userId: string
  policyId: string
  policy: Policy
  paymentId?: string
  payment?: Payment
  policyNumber?: string
  premiumPaid: number
  sumAssured?: number
  status: 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED'
  insuredDetails?: Record<string, any>
  nomineeDetails?: Record<string, any>
  documentUrl?: string
  activatedAt?: string
  expiresAt?: string
  nextRenewalAt?: string
  createdAt: string
}

// ── Payment ───────────────────────────────────────────────────────────────
export interface Payment {
  id: string
  userId: string
  idempotencyKey: string
  razorpayOrderId?: string
  razorpayPaymentId?: string
  amount: number
  currency: string
  status: 'PENDING' | 'CREATED' | 'CAPTURED' | 'FAILED' | 'REFUNDED'
  paymentMethod?: string
  description?: string
  failureReason?: string
  paidAt?: string
  createdAt: string
}

export interface RazorpayOrder {
  orderId: string
  amount: number
  currency: string
  keyId: string
  paymentId: string
  purchaseId: string
  policy: { name: string; insurer: string }
  prefill: { name: string; email: string; contact?: string }
}

// ── Recommendation ────────────────────────────────────────────────────────
export interface Recommendation {
  policy: Policy
  score: number
  reasons: string[]
  rank: number
}

export interface Insight {
  type: 'ACTION' | 'TIP' | 'ALERT' | 'GAP'
  title: string
  description: string
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
}

// ── Comparison ────────────────────────────────────────────────────────────
export interface ComparisonField {
  key: string
  label: string
  format: 'currency' | 'number' | 'percent' | 'rating'
  values: Array<{ policyId: string; value: any; isBest: boolean }>
}

export interface ComparisonResult {
  policies: Array<Policy & { liveQuote?: Quote }>
  comparisonMatrix: ComparisonField[]
}

// ── Dashboard ─────────────────────────────────────────────────────────────
export interface DashboardData {
  user: { id: string; fullName: string; email: string }
  stats: {
    totalPolicies: number
    activePolicies: number
    expiringSoon: number
    totalPremiumPaid: number
  }
  recentPolicies: Purchase[]
  recentQuotes: Quote[]
  expiringSoon: Purchase[]
}

// ── Analytics ─────────────────────────────────────────────────────────────
export interface AnalyticsOverview {
  users:    { total: number; newThisMonth: number }
  policies: { totalActive: number; soldThisMonth: number }
  revenue:  { total: number; thisMonth: number; lastMonth: number; growthPercent: number }
  quotes:   { pending: number }
}

// ── API ───────────────────────────────────────────────────────────────────
export interface ApiResponse<T = any> {
  success: boolean
  message?: string
  data?: T
  errors?: any
  statusCode?: number
}

export interface PaginatedResponse<T> {
  items: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface FilterPoliciesParams {
  category?: PolicyCategory
  minPremium?: number
  maxPremium?: number
  minSumAssured?: number
  maxSumAssured?: number
  age?: number
  insurerIds?: string[]
  isFeatured?: boolean
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
  page?: number
  limit?: number
  search?: string
}
