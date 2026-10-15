import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module';
import { PrismaService } from '../prisma/prisma.service';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';

@Module({ imports: [MediaModule], controllers: [CatalogController], providers: [CatalogService, PrismaService] })
export class CatalogModule {}
