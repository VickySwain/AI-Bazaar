import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  IsUrl,
  IsPostalCode,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IncomeBracket, CityTier, Gender } from '../entities/user-profile.entity';

export class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  age?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  pincode?: string;

  @ApiPropertyOptional({ enum: CityTier })
  @IsOptional()
  @IsEnum(CityTier)
  cityTier?: CityTier;

  @ApiPropertyOptional({ enum: IncomeBracket })
  @IsOptional()
  @IsEnum(IncomeBracket)
  incomeBracket?: IncomeBracket;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isSmoker?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasDiabetes?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasHypertension?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasHeartDisease?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  @Type(() => Number)
  familyMembers?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  monthlyBudget?: number;

  @ApiPropertyOptional()
  @IsOptional()
  preferences?: Record<string, any>;
}

export class KycDto {
  @ApiPropertyOptional()
  @IsString()
  documentType: string;

  @ApiPropertyOptional()
  @IsString()
  documentNumber: string;
}
