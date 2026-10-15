import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}
  @Get()
  @ApiOperation({ summary: 'API liveness (does not check the database)' })
  live() { return { status: 'ok', service: 'howtochoose-api' }; }
  @Get('ready')
  @ApiOperation({ summary: 'Database connectivity readiness' })
  async ready() {
    try { await this.prisma.$queryRaw`SELECT 1`; return { status: 'ok', database: 'connected' }; }
    catch { throw new ServiceUnavailableException('Database unavailable'); }
  }
}
