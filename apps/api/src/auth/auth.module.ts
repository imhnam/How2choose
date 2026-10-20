import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleService } from './google.service';
import { SessionGuard } from './session.guard';
import { PrismaService } from '../prisma/prisma.service';
import { LocationsModule } from '../locations/locations.module';
@Module({imports:[LocationsModule],controllers:[AuthController],providers:[AuthService,GoogleService,SessionGuard,PrismaService],exports:[AuthService,SessionGuard]})
export class AuthModule {}
