import { Body, Controller, Delete, Get, Param, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { AuthRequest } from '../auth/auth.types';
import { SessionGuard } from '../auth/session.guard';
import { AdminGuard } from './admin.guard';
import { MediaService } from './media.service';

const uploadBody = {
  schema: {
    type: 'object',
    properties: {
      file: { type: 'string', format: 'binary' },
      kind: { type: 'string', enum: ['IMAGE', 'VIDEO'] },
      sortOrder: { type: 'integer', minimum: 0 },
    },
    required: ['file'],
  },
};

@ApiTags('media')
@Controller('media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Get('avatar')
  @UseGuards(SessionGuard)
  getAvatar(@Req() request: AuthRequest) {
    return this.media.getAvatar(request.authUser!.id);
  }

  @Post('avatar')
  @UseGuards(SessionGuard)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024, files: 1 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } }, required: ['file'] } })
  uploadAvatar(@Req() request: AuthRequest, @UploadedFile() file?: Express.Multer.File) {
    return this.media.uploadAvatar(request.authUser!.id, file);
  }

  @Delete('avatar')
  @UseGuards(SessionGuard)
  removeAvatar(@Req() request: AuthRequest) {
    return this.media.removeAvatar(request.authUser!.id);
  }

  @Get('products/:productId')
  listProductMedia(@Param('productId') productId: string) {
    return this.media.listProductMedia(productId);
  }

  @Get('variants/:variantId')
  listVariantMedia(@Param('variantId') variantId: string) {
    return this.media.listVariantMedia(variantId);
  }

  @Post('products/:productId')
  @UseGuards(SessionGuard, AdminGuard)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 100 * 1024 * 1024, files: 1 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody(uploadBody)
  uploadProductMedia(
    @Param('productId') productId: string,
    @Body('kind') kind: string | undefined,
    @Body('sortOrder') sortOrder: string | undefined,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.media.uploadProductMedia(productId, kind, sortOrder, file);
  }

  @Post('variants/:variantId')
  @UseGuards(SessionGuard, AdminGuard)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 100 * 1024 * 1024, files: 1 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody(uploadBody)
  uploadVariantMedia(
    @Param('variantId') variantId: string,
    @Body('kind') kind: string | undefined,
    @Body('sortOrder') sortOrder: string | undefined,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.media.uploadVariantMedia(variantId, kind, sortOrder, file);
  }

  @Delete('products/items/:mediaId')
  @UseGuards(SessionGuard, AdminGuard)
  removeProductMedia(@Param('mediaId') mediaId: string) {
    return this.media.removeProductMedia(mediaId);
  }
}
