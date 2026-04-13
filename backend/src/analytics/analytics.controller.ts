import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('analytics')
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: '[Admin] Get platform overview stats' })
  async getOverview() {
    const data = await this.analyticsService.getAdminOverview();
    return { success: true, data };
  }

  @Get('revenue-trend')
  @ApiOperation({ summary: '[Admin] Get monthly revenue trend' })
  @ApiQuery({ name: 'months', required: false, type: Number })
  async getRevenueTrend(@Query('months') months = 6) {
    const data = await this.analyticsService.getRevenueTrend(+months);
    return { success: true, data };
  }

  @Get('category-breakdown')
  @ApiOperation({ summary: '[Admin] Get policy sales by category' })
  async getCategoryBreakdown() {
    const data = await this.analyticsService.getPolicyCategoryBreakdown();
    return { success: true, data };
  }

  @Get('top-policies')
  @ApiOperation({ summary: '[Admin] Get top selling policies' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getTopPolicies(@Query('limit') limit = 5) {
    const data = await this.analyticsService.getTopPolicies(+limit);
    return { success: true, data };
  }

  @Get('user-growth')
  @ApiOperation({ summary: '[Admin] Get user growth trend' })
  @ApiQuery({ name: 'months', required: false, type: Number })
  async getUserGrowth(@Query('months') months = 6) {
    const data = await this.analyticsService.getUserGrowthTrend(+months);
    return { success: true, data };
  }

  @Get('conversion-funnel')
  @ApiOperation({ summary: '[Admin] Get conversion funnel data' })
  async getConversionFunnel() {
    const data = await this.analyticsService.getConversionFunnel();
    return { success: true, data };
  }
}
