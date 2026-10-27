import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../auth/admin.guard';
import { SessionGuard } from '../auth/session.guard';
import {
  AdminOrderQueryDto,
  AdminProductQueryDto,
  CreateCategoryDto,
  CreateProductDto,
  CreateVariantDto,
  ReorderMediaDto,
  UpdateCategoryDto,
  UpdateProductDto,
  UpdateVariantDto,
} from './admin.dto';
import { AdminService } from './admin.service';

@ApiTags('admin')
@Controller('admin')
@UseGuards(SessionGuard, AdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('summary')
  summary() {
    return this.admin.summary();
  }

  @Get('categories')
  categories() {
    return this.admin.listCategories();
  }

  @Post('categories')
  createCategory(@Body() body: CreateCategoryDto) {
    return this.admin.createCategory(body);
  }

  @Patch('categories/:id')
  updateCategory(@Param('id') id: string, @Body() body: UpdateCategoryDto) {
    return this.admin.updateCategory(id, body);
  }

  @Delete('categories/:id')
  deleteCategory(@Param('id') id: string, @Query('hard') hard?: string) {
    return this.admin.deleteCategory(id, hard === 'true');
  }

  @Get('products')
  products(@Query() query: AdminProductQueryDto) {
    return this.admin.listProducts(query);
  }

  @Post('products')
  createProduct(@Body() body: CreateProductDto) {
    return this.admin.createProduct(body);
  }

  @Get('products/:id')
  product(@Param('id') id: string) {
    return this.admin.getProduct(id);
  }

  @Patch('products/:id')
  updateProduct(@Param('id') id: string, @Body() body: UpdateProductDto) {
    return this.admin.updateProduct(id, body);
  }

  @Delete('products/:id')
  archiveProduct(@Param('id') id: string) {
    return this.admin.archiveProduct(id);
  }

  @Post('products/:id/restore')
  restoreProduct(@Param('id') id: string) {
    return this.admin.restoreProduct(id);
  }

  @Post('products/:id/variants')
  createVariant(@Param('id') productId: string, @Body() body: CreateVariantDto) {
    return this.admin.createVariant(productId, body);
  }

  @Patch('variants/:id')
  updateVariant(@Param('id') id: string, @Body() body: UpdateVariantDto) {
    return this.admin.updateVariant(id, body);
  }

  @Delete('variants/:id')
  deleteVariant(@Param('id') id: string) {
    return this.admin.deleteVariant(id);
  }

  @Post('media/reorder')
  reorderMedia(@Body() body: ReorderMediaDto) {
    return this.admin.reorderMedia(body);
  }

  @Get('orders')
  orders(@Query() query: AdminOrderQueryDto) {
    return this.admin.listOrders(query);
  }

  @Get('orders/:id')
  order(@Param('id') id: string) {
    return this.admin.getOrder(id);
  }

  @Post('orders/:id/shipment/retry')
  retryShipment(@Param('id') id: string) {
    return this.admin.retryOrderShipment(id);
  }
}
