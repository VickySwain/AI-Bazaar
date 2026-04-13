import { Injectable, Logger } from '@nestjs/common';
import {
  InsurerAdapter,
  NormalizedPolicy,
  NormalizedQuote,
  QuoteRequest,
} from './insurer.adapter';
import { PolicyCategory } from '../entities/policy.entity';

@Injectable()
export class HdfcAdapter extends InsurerAdapter {
  private readonly logger = new Logger(HdfcAdapter.name);

  getName(): string {
    return 'HDFC Life';
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async fetchPolicies(category?: PolicyCategory): Promise<NormalizedPolicy[]> {
    this.logger.log('Fetching HDFC Life policies');

    const policies: NormalizedPolicy[] = [
      {
        externalId: 'HDFC-CLICK2PROTECT-SUPER',
        name: 'HDFC Life Click 2 Protect Super',
        category: PolicyCategory.TERM,
        basePremium: 7200,
        sumAssured: 10000000,
        minAge: 18,
        maxAge: 65,
        coverageDetails: {
          lifeCover: '1 Crore+',
          criticalIllnessCover: 'Optional up to 50L',
          accidentCover: 'Optional',
          returnOfPremium: 'Available',
        },
        inclusions: [
          'Life cover',
          'Critical illness rider',
          'Accidental death rider',
          'Waiver of premium on disability',
        ],
        exclusions: ['Suicide within 12 months', 'Hazardous activities'],
        waitingPeriodDays: 0,
        metadata: { uin: '101N132V06', claimRatio: '99.4%' },
      } as any,
      {
        externalId: 'HDFC-OPTIMA-RESTORE',
        name: 'HDFC ERGO Optima Restore',
        category: PolicyCategory.HEALTH,
        basePremium: 9800,
        sumAssured: 500000,
        minAge: 18,
        maxAge: 65,
        cashlessHospitals: 13000,
        coverageDetails: {
          roomRent: 'No capping',
          restoreBenefit: '100% auto-restore',
          noClaimBonus: '50% annually up to 100%',
          preHospitalization: '60 days',
          postHospitalization: '180 days',
        },
        inclusions: [
          'Hospitalization expenses',
          'Day care procedures',
          'Domiciliary treatment',
          'Mental illness coverage',
          'OPD coverage',
          'Ambulance cover',
          'Restore benefit',
        ],
        exclusions: ['Pre-existing diseases (2yr waiting)', 'Cosmetic surgery', 'Dental'],
        waitingPeriodDays: 30,
        metadata: { uin: '101H062V04', cashlessNetwork: 13000 },
      } as any,
      {
        externalId: 'HDFC-SANCHAY-PLUS',
        name: 'HDFC Life Sanchay Plus',
        category: PolicyCategory.LIFE,
        basePremium: 25000,
        sumAssured: 3000000,
        minAge: 30,
        maxAge: 65,
        coverageDetails: {
          guaranteedReturns: '5.56% p.a. on premium',
          lifeCover: 'Yes',
          payoutOption: 'Immediate or deferred',
        },
        inclusions: ['Guaranteed returns', 'Life cover', 'Tax benefits'],
        exclusions: ['Market risk (not ULIP)', 'Early surrender penalty'],
        waitingPeriodDays: 0,
        metadata: { uin: '101N134V05' },
      } as any,
    ];

    if (category) return policies.filter((p) => p.category === category);
    return policies;
  }

  async fetchQuote(policyExternalId: string, request: QuoteRequest): Promise<NormalizedQuote> {
    this.logger.log(`Fetching HDFC quote for ${policyExternalId}`);

    const smokingLoading = request.isSmoker ? 1.25 : 1;
    const ageMultiplier = 1 + Math.max(0, request.age - 30) * 0.03;

    let basePremium = 0;

    switch (policyExternalId) {
      case 'HDFC-CLICK2PROTECT-SUPER':
        basePremium = ((request.sumAssured || 10000000) / 1000000) * 700 * ageMultiplier * smokingLoading;
        break;
      case 'HDFC-OPTIMA-RESTORE':
        basePremium = 9800 * ageMultiplier * (request.familyMembers > 1 ? 1.5 : 1);
        break;
      default:
        basePremium = 15000 * ageMultiplier;
    }

    const annualPremium = Math.round(basePremium);
    const gstAmount = Math.round(annualPremium * 0.18);

    return {
      externalId: `HDFC-QUOTE-${Date.now()}`,
      policyId: policyExternalId,
      quotedPremium: annualPremium / 12,
      annualPremium,
      gstAmount,
      totalPremium: annualPremium + gstAmount,
      validityDays: 30,
      breakdown: { basePremium, smokingLoading, ageMultiplier },
    };
  }

  async initiatePolicy(quoteId: string, userDetails: Record<string, any>): Promise<string> {
    return `HDFC-POL-${Date.now()}`;
  }
}
