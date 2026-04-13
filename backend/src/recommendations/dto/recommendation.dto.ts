import { IsOptional, IsNumber, IsEnum, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PolicyCategory } from '../../policies/entities/policy.entity';

export class GetRecommendationsDto {
  @ApiPropertyOptional({ enum: PolicyCategory })
  @IsOptional()
  @IsEnum(PolicyCategory)
  category?: PolicyCategory;

  @ApiPropertyOptional({ default: 5, maximum: 20 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  age?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  budget?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  includeFeatures?: boolean;
}

export class TrackInteractionDto {
  @ApiPropertyOptional()
  recommendationId: string;

  @ApiPropertyOptional()
  action: 'click' | 'quote' | 'purchase';
}
