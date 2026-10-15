import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../prisma/prisma.service';
import { RecipientsController } from './recipients.controller';
import { RecipientsService } from './recipients.service';
@Module({imports:[AuthModule],controllers:[RecipientsController],providers:[RecipientsService,PrismaService]})
export class RecipientsModule {}
