import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsArray,
  IsBoolean,
  Min,
  Max,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PolicyCategory } from '../entities/policy.entity';

export class FilterPoliciesDto {
  @ApiPropertyOptional({ enum: PolicyCategory })
  @IsOptional()
  @IsEnum(PolicyCategory)
  category?: PolicyCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minPremium?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxPremium?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minSumAssured?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxSumAssured?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  age?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  insurerIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ default: 'basePremium' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], default: 'ASC' })
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC';

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}

export class ComparePoliciesDto {
  @ApiProperty({ type: [String], description: 'Array of policy UUIDs (2-4)' })
  @IsArray()
  @IsUUID('4', { each: true })
  policyIds: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  age?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  sumAssured?: number;
}

export class CreateQuoteDto {
  @ApiProperty()
  @IsUUID()
  policyId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  age?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  sumAssured?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  policyTerm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  parameters?: Record<string, any>;
}

export class CreatePolicyDto {
  @ApiProperty()
  @IsUUID()
  insurerId: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: PolicyCategory })
  @IsEnum(PolicyCategory)
  category: PolicyCategory;

  @ApiProperty()
  @IsNumber()
  basePremium: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  sumAssured?: number;

  @ApiPropertyOptional()
  @IsOptional()
  coverageDetails?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  inclusions?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  exclusions?: string[];
}
