import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  HealthCheck,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../auth/decorators/public.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
  ) {}

  @Public()
  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Health check — DB, memory, disk' })
  check() {
    return this.health.check([
      () => this.db.pingCheck('database', { timeout: 3000 }),
      () => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024), // 512MB
      () => this.memory.checkRSS('memory_rss', 512 * 1024 * 1024),
    ]);
  }

  @Public()
  @Get('ping')
  @ApiOperation({ summary: 'Simple ping endpoint' })
  ping() {
    return { status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' };
  }
}
