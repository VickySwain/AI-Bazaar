import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  InsurerAdapter,
  NormalizedPolicy,
  NormalizedQuote,
  QuoteRequest,
} from './insurer.adapter';
import { PolicyCategory } from '../entities/policy.entity';

@Injectable()
export class LicAdapter extends InsurerAdapter {
  private readonly logger = new Logger(LicAdapter.name);
  private readonly baseUrl: string;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {
    super();
    this.baseUrl = 'https://api.licindia.in/v1'; // Mocked
  }

  getName(): string {
    return 'LIC';
  }

  async isAvailable(): Promise<boolean> {
    try {
      // In production, ping LIC health endpoint
      return true;
    } catch {
      return false;
    }
  }

  async fetchPolicies(category?: PolicyCategory): Promise<NormalizedPolicy[]> {
    // In production: call LIC API
    // Returning mock data that represents real LIC products
    this.logger.log('Fetching LIC policies');

    const policies: NormalizedPolicy[] = [
      {
        externalId: 'LIC-JEEVAN-ANAND-149',
        name: 'LIC Jeevan Anand',
        category: PolicyCategory.LIFE,
        basePremium: 12500,
        sumAssured: 1000000,
        minAge: 18,
        maxAge: 50,
        policyTermYears: 35,
        coverageDetails: {
          deathBenefit: 'Sum Assured + Bonus',
          maturityBenefit: 'Sum Assured + Bonus',
          accidentalDeathBenefit: 'Additional Sum Assured',
        },
        inclusions: [
          'Death benefit',
          'Maturity benefit',
          'Accidental death rider',
          'Participating in profits',
        ],
        exclusions: ['Suicide within 1 year', 'War or civil commotion'],
        waitingPeriodDays: 0,
        metadata: { planNumber: '149', bonusRate: 'Rs 42 per 1000 SA' },
      } as any,
      {
        externalId: 'LIC-JEEVAN-UMANG-945',
        name: 'LIC Jeevan Umang',
        category: PolicyCategory.LIFE,
        basePremium: 18000,
        sumAssured: 2000000,
        minAge: 90,
        maxAge: 55,
        coverageDetails: {
          survivalBenefit: '8% of Sum Assured annually after PPT',
          deathBenefit: 'Higher of 10x annual premium or 105% of premiums paid',
        },
        inclusions: ['Annual survival benefits', 'Death benefit', 'Maturity benefit'],
        exclusions: ['Self-inflicted injuries'],
        waitingPeriodDays: 0,
        metadata: { planNumber: '945' },
      } as any,
      {
        externalId: 'LIC-NEW-JEEVAN-AMAR-855',
        name: 'LIC New Jeevan Amar',
        category: PolicyCategory.TERM,
        basePremium: 8400,
        sumAssured: 5000000,
        minAge: 18,
        maxAge: 65,
        coverageDetails: {
          deathBenefit: 'Sum Assured on death',
          returnOfPremium: 'Optional rider',
        },
        inclusions: ['Death benefit', 'Tax benefits under 80C and 10D'],
        exclusions: ['Suicide within 1 year', 'Death due to terrorism'],
        waitingPeriodDays: 0,
        metadata: { planNumber: '855', premiumPaymentMode: 'Yearly/Half-yearly/Quarterly/Monthly' },
      } as any,
    ];

    if (category) {
      return policies.filter((p) => p.category === category);
    }

    return policies;
  }

  async fetchQuote(policyExternalId: string, request: QuoteRequest): Promise<NormalizedQuote> {
    this.logger.log(`Fetching LIC quote for policy ${policyExternalId}`);

    // Premium calculation logic (simplified)
    let basePremium = 0;
    const ageMultiplier = 1 + (request.age - 25) * 0.02;

    switch (policyExternalId) {
      case 'LIC-JEEVAN-ANAND-149':
        basePremium = 12500 * ageMultiplier;
        break;
      case 'LIC-NEW-JEEVAN-AMAR-855':
        basePremium = (request.sumAssured / 1000) * 1.68 * ageMultiplier;
        break;
      default:
        basePremium = 15000 * ageMultiplier;
    }

    const annualPremium = Math.round(basePremium);
    const gstAmount = Math.round(annualPremium * 0.18);
    const totalPremium = annualPremium + gstAmount;

    return {
      externalId: `LIC-QUOTE-${Date.now()}`,
      policyId: policyExternalId,
      quotedPremium: annualPremium / 12,
      annualPremium,
      gstAmount,
      totalPremium,
      validityDays: 30,
      breakdown: {
        basePremium,
        gst: '18%',
        discounts: [],
      },
    };
  }

  async initiatePolicy(quoteId: string, userDetails: Record<string, any>): Promise<string> {
    this.logger.log(`Initiating LIC policy for quote ${quoteId}`);
    // In production: call LIC API to create policy
    return `LIC-POL-${Date.now()}`;
  }
}
