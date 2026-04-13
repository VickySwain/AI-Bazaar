import { PolicyCategory } from '../entities/policy.entity';

export interface NormalizedPolicy {
  externalId: string;
  name: string;
  category: PolicyCategory;
  basePremium: number;
  sumAssured?: number;
  minAge?: number;
  maxAge?: number;
  coverageDetails?: Record<string, any>;
  inclusions?: string[];
  exclusions?: string[];
  waitingPeriodDays?: number;
  cashlessHospitals?: number;
  metadata?: Record<string, any>;
}

export interface QuoteRequest {
  age: number;
  gender?: string;
  sumAssured?: number;
  policyTerm?: number;
  isSmoker?: boolean;
  city?: string;
  familyMembers?: number;
}

export interface NormalizedQuote {
  externalId: string;
  policyId: string;
  quotedPremium: number;
  annualPremium: number;
  gstAmount: number;
  totalPremium: number;
  validityDays: number;
  breakdown?: Record<string, any>;
}

export abstract class InsurerAdapter {
  abstract getName(): string;
  abstract isAvailable(): Promise<boolean>;
  abstract fetchPolicies(category?: PolicyCategory): Promise<NormalizedPolicy[]>;
  abstract fetchQuote(policyExternalId: string, request: QuoteRequest): Promise<NormalizedQuote>;
  abstract initiatePolicy(quoteId: string, userDetails: Record<string, any>): Promise<string>;
}
