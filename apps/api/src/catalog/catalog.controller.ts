import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CatalogService } from './catalog.service';

@ApiTags('catalog')
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('categories')
  categories() {
    return this.catalog.listCategories();
  }

  @Get('products')
  products(@Query('category') category?: string, @Query('q') search?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.catalog.listProducts({ category, search, page, limit });
  }

  @Get('products/:slug')
  product(@Param('slug') slug: string) {
    return this.catalog.getProduct(slug);
  }
}
