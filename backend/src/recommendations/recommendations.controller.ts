import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RecommendationsService } from './recommendations.service';
import { GetRecommendationsDto, TrackInteractionDto } from './dto/recommendation.dto';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser } from '../auth/decorators/public.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Recommendations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('recommendations')
export class RecommendationsController {
  constructor(private recommendationsService: RecommendationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get AI-powered policy recommendations for the current user' })
  async getRecommendations(
    @CurrentUser() user: User,
    @Query() dto: GetRecommendationsDto,
  ): Promise<any> {
    const recommendations = await this.recommendationsService.getRecommendations(user, dto);
    return {
      success: true,
      data: {
        recommendations,
        modelVersion: 'v1.0.0',
        generatedAt: new Date().toISOString(),
      },
    };
  }

  @Get('insights')
  @ApiOperation({ summary: 'Get personalized insurance insights and coverage gap analysis' })
  async getInsights(@CurrentUser() user: User) {
    const insights = await this.recommendationsService.getPersonalizedInsights(user);
    return { success: true, data: { insights } };
  }

  @Post('track')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Track user interaction with a recommendation (click, quote, purchase)' })
  async trackInteraction(
    @CurrentUser() user: User,
    @Body() dto: TrackInteractionDto,
  ) {
    await this.recommendationsService.trackInteraction(user.id, dto);
    return { success: true, message: 'Interaction tracked' };
  }
}
