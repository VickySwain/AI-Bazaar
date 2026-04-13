import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Patch,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto, KycDto } from './dto/user.dto';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { User, UserRole } from './entities/user.entity';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get current user dashboard data' })
  async getDashboard(@CurrentUser() user: User) {
    const data = await this.usersService.getDashboard(user.id);
    return { success: true, data };
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser() user: User) {
    const fullUser = await this.usersService.findById(user.id);
    return { success: true, data: { user: fullUser } };
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update current user profile' })
  async updateProfile(@CurrentUser() user: User, @Body() dto: UpdateProfileDto) {
    const updated = await this.usersService.updateProfile(user.id, dto);
    return { success: true, message: 'Profile updated successfully', data: { user: updated } };
  }

  @Get('policies')
  @ApiOperation({ summary: 'Get all purchased policies for current user' })
  async getMyPolicies(@CurrentUser() user: User) {
    const policies = await this.usersService.getPolicies(user.id);
    return { success: true, data: { policies } };
  }

  @Get('quotes')
  @ApiOperation({ summary: 'Get all quotes for current user' })
  async getMyQuotes(@CurrentUser() user: User) {
    const quotes = await this.usersService.getQuotes(user.id);
    return { success: true, data: { quotes } };
  }

  @Post('kyc')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit KYC documents' })
  async submitKyc(@CurrentUser() user: User, @Body() dto: KycDto) {
    const profile = await this.usersService.submitKyc(user.id, dto);
    return { success: true, message: 'KYC submitted successfully', data: { profile } };
  }

  @Delete('account')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate current user account' })
  async deactivateAccount(@CurrentUser() user: User) {
    await this.usersService.deactivateAccount(user.id, user.id);
    return { success: true, message: 'Account deactivated successfully' };
  }

  // ── Admin routes ──────────────────────────────────────────────────────────

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] List all users' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  async getAllUsers(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
  ) {
    const result = await this.usersService.getAllUsers(+page, +limit, search);
    return { success: true, data: result };
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Get user by ID' })
  async getUserById(@Param('id', ParseUUIDPipe) id: string) {
    const user = await this.usersService.findById(id);
    return { success: true, data: { user } };
  }

  @Patch(':id/role')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Update user role' })
  async updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('role') role: UserRole,
  ) {
    const user = await this.usersService.updateUserRole(id, role);
    return { success: true, message: 'Role updated', data: { user } };
  }
}


