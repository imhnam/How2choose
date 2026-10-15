import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('DATABASE_URL is required. Run npm run setup first.');
    super({ adapter: new PrismaPg({ connectionString, connectionTimeoutMillis: 2000 }) });
  }
  async onModuleDestroy() { await this.$disconnect(); }
}
