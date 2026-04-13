import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { PoliciesService } from './policies.service';
import {
  FilterPoliciesDto,
  ComparePoliciesDto,
  CreateQuoteDto,
  CreatePolicyDto,
} from './dto/policy.dto';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { User, UserRole } from '../users/entities/user.entity';

@ApiTags('Policies')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('policies')
export class PoliciesController {
  constructor(private policiesService: PoliciesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List and filter all policies' })
  async findAll(@Query() dto: FilterPoliciesDto) {
    const data = await this.policiesService.findAll(dto);
    return { success: true, data };
  }

  @Public()
  @Get('categories')
  @ApiOperation({ summary: 'Get all policy categories' })
  async getCategories() {
    const categories = await this.policiesService.getCategories();
    return { success: true, data: { categories } };
  }

  @Public()
  @Get('insurers')
  @ApiOperation({ summary: 'Get all active insurers' })
  async getInsurers() {
    const insurers = await this.policiesService.getInsurers();
    return { success: true, data: { insurers } };
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get policy details by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const policy = await this.policiesService.findOne(id);
    return { success: true, data: { policy } };
  }

  @Public()
  @Post('compare')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Compare multiple policies side by side' })
  async compare(@Body() dto: ComparePoliciesDto) {
    const data = await this.policiesService.compare(dto);
    return { success: true, data };
  }

  @Post('quote')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate a personalized quote for a policy' })
  async createQuote(@CurrentUser() user: User, @Body() dto: CreateQuoteDto) {
    const quote = await this.policiesService.createQuote(user, dto);
    return { success: true, message: 'Quote generated successfully', data: { quote } };
  }

  // ── Admin routes ──────────────────────────────────────────────────────────

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '[Admin] Create a new policy' })
  async create(@Body() dto: CreatePolicyDto) {
    const policy = await this.policiesService.create(dto);
    return { success: true, message: 'Policy created', data: { policy } };
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] Update a policy' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreatePolicyDto>,
  ) {
    const policy = await this.policiesService.update(id, dto);
    return { success: true, message: 'Policy updated', data: { policy } };
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Admin] Deactivate a policy' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.policiesService.remove(id);
    return { success: true, message: 'Policy deactivated' };
  }

  @Post('admin/sync')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Admin] Sync policies from all insurer adapters' })
  async syncFromAdapters() {
    const result = await this.policiesService.syncFromAdapters();
    return { success: true, message: 'Sync complete', data: result };
  }
}
