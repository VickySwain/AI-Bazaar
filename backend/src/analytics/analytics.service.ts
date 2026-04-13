import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Purchase, PurchaseStatus } from '../policies/entities/purchase.entity';
import { Payment, PaymentStatus } from '../payments/entities/payment.entity';
import { User } from '../users/entities/user.entity';
import { Quote } from '../policies/entities/quote.entity';
import { Policy } from '../policies/entities/policy.entity';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(Purchase)
    private purchaseRepository: Repository<Purchase>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Quote)
    private quoteRepository: Repository<Quote>,
    @InjectRepository(Policy)
    private policyRepository: Repository<Policy>,
  ) {}

  async getAdminOverview() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalUsers,
      newUsersThisMonth,
      totalPoliciesSold,
      policiesThisMonth,
      revenueThisMonth,
      revenueLastMonth,
      totalRevenue,
      pendingQuotes,
    ] = await Promise.all([
      this.userRepository.count({ where: { isActive: true } }),
      this.userRepository.count({
        where: { createdAt: Between(startOfMonth, now) as any },
      }),
      this.purchaseRepository.count({ where: { status: PurchaseStatus.ACTIVE } }),
      this.purchaseRepository.count({
        where: { createdAt: Between(startOfMonth, now) as any },
      }),
      this.paymentRepository
        .createQueryBuilder('p')
        .select('COALESCE(SUM(p.amount), 0)', 'total')
        .where('p.status = :status', { status: PaymentStatus.CAPTURED })
        .andWhere('p.paid_at >= :start', { start: startOfMonth })
        .getRawOne(),
      this.paymentRepository
        .createQueryBuilder('p')
        .select('COALESCE(SUM(p.amount), 0)', 'total')
        .where('p.status = :status', { status: PaymentStatus.CAPTURED })
        .andWhere('p.paid_at BETWEEN :start AND :end', {
          start: startOfLastMonth,
          end: endOfLastMonth,
        })
        .getRawOne(),
      this.paymentRepository
        .createQueryBuilder('p')
        .select('COALESCE(SUM(p.amount), 0)', 'total')
        .where('p.status = :status', { status: PaymentStatus.CAPTURED })
        .getRawOne(),
      this.quoteRepository.count({ where: { status: 'ACTIVE' as any } }),
    ]);

    const thisMonthRevenue = parseFloat(revenueThisMonth?.total || '0');
    const lastMonthRevenue = parseFloat(revenueLastMonth?.total || '0');
    const revenueGrowth = lastMonthRevenue > 0
      ? (((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(1)
      : '0';

    return {
      users: {
        total: totalUsers,
        newThisMonth: newUsersThisMonth,
      },
      policies: {
        totalActive: totalPoliciesSold,
        soldThisMonth: policiesThisMonth,
      },
      revenue: {
        total: parseFloat(totalRevenue?.total || '0'),
        thisMonth: thisMonthRevenue,
        lastMonth: lastMonthRevenue,
        growthPercent: parseFloat(revenueGrowth),
      },
      quotes: {
        pending: pendingQuotes,
      },
    };
  }

  async getRevenueTrend(months = 6) {
    const results = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const revenue = await this.paymentRepository
        .createQueryBuilder('p')
        .select('COALESCE(SUM(p.amount), 0)', 'total')
        .addSelect('COUNT(*)', 'count')
        .where('p.status = :status', { status: PaymentStatus.CAPTURED })
        .andWhere('p.paid_at BETWEEN :start AND :end', { start, end })
        .getRawOne();

      results.push({
        month: start.toLocaleString('default', { month: 'short', year: 'numeric' }),
        revenue: parseFloat(revenue?.total || '0'),
        transactions: parseInt(revenue?.count || '0'),
      });
    }

    return results;
  }

  async getPolicyCategoryBreakdown() {
    const breakdown = await this.purchaseRepository
      .createQueryBuilder('purchase')
      .leftJoin('purchase.policy', 'policy')
      .select('policy.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(purchase.premium_paid), 0)', 'totalPremium')
      .where('purchase.status = :status', { status: PurchaseStatus.ACTIVE })
      .groupBy('policy.category')
      .getRawMany();

    return breakdown.map((row) => ({
      category: row.category,
      count: parseInt(row.count),
      totalPremium: parseFloat(row.totalPremium),
    }));
  }

  async getTopPolicies(limit = 5) {
    return this.policyRepository
      .createQueryBuilder('policy')
      .leftJoinAndSelect('policy.insurer', 'insurer')
      .leftJoin('policy.purchases', 'purchase')
      .select(['policy.id', 'policy.name', 'policy.category', 'policy.basePremium', 'insurer.name'])
      .addSelect('COUNT(purchase.id)', 'purchaseCount')
      .where('policy.status = :status', { status: 'ACTIVE' })
      .groupBy('policy.id, insurer.name')
      .orderBy('purchaseCount', 'DESC')
      .limit(limit)
      .getRawAndEntities()
      .then(({ entities, raw }) =>
        entities.map((policy, i) => ({
          ...policy,
          purchaseCount: parseInt(raw[i]?.purchaseCount || '0'),
        })),
      );
  }

  async getUserGrowthTrend(months = 6) {
    const results = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const count = await this.userRepository
        .createQueryBuilder('u')
        .where('u.created_at BETWEEN :start AND :end', { start, end })
        .getCount();

      results.push({
        month: start.toLocaleString('default', { month: 'short', year: 'numeric' }),
        newUsers: count,
      });
    }

    return results;
  }

  async getConversionFunnel() {
    const [totalVisitors, quotesCreated, ordersCreated, purchasesCompleted] = await Promise.all([
      // Visitors approximated from total quotes * 3 (rough funnel estimate)
      this.quoteRepository.count(),
      this.quoteRepository.count(),
      this.paymentRepository.count({ where: { status: PaymentStatus.CREATED } }),
      this.purchaseRepository.count({ where: { status: PurchaseStatus.ACTIVE } }),
    ]);

    const estimatedVisitors = totalVisitors * 3;

    return [
      { stage: 'Visitors', count: estimatedVisitors, percentage: 100 },
      {
        stage: 'Quotes Generated',
        count: quotesCreated,
        percentage: estimatedVisitors > 0 ? Math.round((quotesCreated / estimatedVisitors) * 100) : 0,
      },
      {
        stage: 'Orders Created',
        count: ordersCreated,
        percentage: quotesCreated > 0 ? Math.round((ordersCreated / quotesCreated) * 100) : 0,
      },
      {
        stage: 'Purchases',
        count: purchasesCompleted,
        percentage: ordersCreated > 0 ? Math.round((purchasesCompleted / ordersCreated) * 100) : 0,
      },
    ];
  }
}
