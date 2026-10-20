import { Module } from '@nestjs/common';
import { LocationsModule } from '../locations/locations.module';
import { GhnService } from './ghn.service';

@Module({ imports: [LocationsModule], providers: [GhnService], exports: [GhnService] })
export class GhnModule {}