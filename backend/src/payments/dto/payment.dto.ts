import { IsString, IsNumber, IsOptional, IsUUID, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateOrderDto {
  @ApiProperty({ description: 'Quote ID to create payment for' })
  @IsUUID()
  quoteId: string;

  @ApiPropertyOptional()
  @IsOptional()
  insuredDetails?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  nomineeDetails?: Record<string, any>;
}

export class VerifyPaymentDto {
  @ApiProperty()
  @IsString()
  razorpayOrderId: string;

  @ApiProperty()
  @IsString()
  razorpayPaymentId: string;

  @ApiProperty()
  @IsString()
  razorpaySignature: string;
}

export class WebhookDto {
  @ApiProperty()
  entity: string;

  @ApiProperty()
  account_id: string;

  @ApiProperty()
  event: string;

  @ApiProperty()
  payload: {
    payment?: { entity: Record<string, any> };
    order?: { entity: Record<string, any> };
    refund?: { entity: Record<string, any> };
  };
}

export class RefundDto {
  @ApiProperty()
  @IsUUID()
  paymentId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
