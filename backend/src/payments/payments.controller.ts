import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Headers,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { CreateOrderDto, VerifyPaymentDto, RefundDto } from './dto/payment.dto';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { User, UserRole } from '../users/entities/user.entity';

@ApiTags('Payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('order')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a Razorpay payment order for a quote' })
  @ApiResponse({ status: 201, description: 'Order created with Razorpay order details' })
  async createOrder(@CurrentUser() user: User, @Body() dto: CreateOrderDto) {
    const data = await this.paymentsService.createOrder(user, dto);
    return { success: true, message: 'Payment order created', data };
  }

  @Post('verify')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify Razorpay payment signature and activate policy' })
  async verifyPayment(@CurrentUser() user: User, @Body() dto: VerifyPaymentDto) {
    const data = await this.paymentsService.verifyPayment(user, dto);
    return { success: true, message: 'Payment verified. Policy activated!', data };
  }

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Razorpay webhook endpoint (public, signature-verified)' })
  async webhook(
    @Req() req: Request,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    await this.paymentsService.handleWebhook(req.body, signature);
    return { status: 'ok' };
  }

  @Get('history')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment history for current user' })
  async getHistory(
    @CurrentUser() user: User,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    const data = await this.paymentsService.getPaymentHistory(user.id, +page, +limit);
    return { success: true, data };
  }

  @Get(':id/status')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get status of a specific payment' })
  async getStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    const payment = await this.paymentsService.getPaymentStatus(id, user.id);
    return { success: true, data: { payment } };
  }

  @Post('refund')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Admin] Initiate a refund for a payment' })
  async initiateRefund(@Body() dto: RefundDto) {
    const data = await this.paymentsService.initiateRefund(dto);
    return { success: true, message: 'Refund initiated', data };
  }
}
