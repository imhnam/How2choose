import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../prisma/prisma.service';
import { AdminGuard } from './admin.guard';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { StorageService } from './storage.service';

@Module({
  imports: [AuthModule],
  controllers: [MediaController],
  providers: [MediaService, StorageService, AdminGuard, PrismaService],
  exports: [StorageService],
})
export class MediaModule {}
