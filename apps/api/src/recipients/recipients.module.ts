import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LocationsModule } from '../locations/locations.module';
import { MediaModule } from '../media/media.module';
import { PrismaService } from '../prisma/prisma.service';
import { RecipientsController } from './recipients.controller';
import { RecipientsService } from './recipients.service';
@Module({imports:[AuthModule,LocationsModule,MediaModule],controllers:[RecipientsController],providers:[RecipientsService,PrismaService]})
export class RecipientsModule {}
