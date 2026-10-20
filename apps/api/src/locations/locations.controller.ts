import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { LocationsService } from './locations.service';

@ApiTags('locations')
@Controller('locations')
export class LocationsController {
  constructor(private readonly locations: LocationsService) {}

  @Get('provinces')
  provinces(@Query('version') version?: string) {
    return this.locations.provinces(this.locations.version(version));
  }

  @Get('districts')
  districts(@Query('provinceCode') provinceCode?: string) {
    return this.locations.districts(this.locations.code(provinceCode));
  }

  @Get('wards')
  wards(@Query('version') version?: string, @Query('parentCode') parentCode?: string) {
    return this.locations.wards(this.locations.version(version), this.locations.code(parentCode));
  }

  @Get('current-from-legacy')
  currentFromLegacy(@Query('wardCode') wardCode?: string) {
    return this.locations.currentFromLegacyWard(this.locations.code(wardCode));
  }
}
