import { Module } from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleService } from './google.service';
import { SessionGuard } from './session.guard';
import { PrismaService } from '../prisma/prisma.service';
import { LocationsModule } from '../locations/locations.module';
@Module({imports:[LocationsModule],controllers:[AuthController],providers:[AuthService,GoogleService,SessionGuard,AdminGuard,PrismaService],exports:[AuthService,SessionGuard,AdminGuard]})
export class AuthModule {}
