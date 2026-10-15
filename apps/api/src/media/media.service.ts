import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from './storage.service';

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async getAvatar(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { avatarObjectKey: true } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng.');
    if (!user.avatarObjectKey) return { url: null };
    return { url: await this.storage.signedUrl(user.avatarObjectKey) };
  }

  async uploadAvatar(userId: string, file: Express.Multer.File | undefined) {
    this.storage.validate(file, 'AVATAR');
    const avatar = file!;
    const current = await this.prisma.user.findUnique({ where: { id: userId }, select: { avatarObjectKey: true } });
    if (!current) throw new NotFoundException('Không tìm thấy người dùng.');

    const objectKey = this.storage.createObjectKey('avatars', userId, avatar.mimetype);
    await this.storage.put(objectKey, avatar);
    try {
      await this.prisma.user.update({ where: { id: userId }, data: { avatarObjectKey: objectKey } });
    } catch (error) {
      await this.storage.remove(objectKey).catch(() => undefined);
      throw error;
    }
    if (current.avatarObjectKey) await this.storage.remove(current.avatarObjectKey).catch(() => undefined);
    return { url: await this.storage.signedUrl(objectKey) };
  }

  async removeAvatar(userId: string) {
    const current = await this.prisma.user.findUnique({ where: { id: userId }, select: { avatarObjectKey: true } });
    if (!current) throw new NotFoundException('Không tìm thấy người dùng.');
    await this.prisma.user.update({ where: { id: userId }, data: { avatarObjectKey: null } });
    if (current.avatarObjectKey) await this.storage.remove(current.avatarObjectKey).catch(() => undefined);
    return { ok: true };
  }

  async listProductMedia(productId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm.');
    const media = await this.prisma.productMedia.findMany({
      where: { productId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return Promise.all(media.map(async item => ({ ...item, url: await this.storage.signedUrl(item.objectKey), objectKey: undefined })));
  }

  async listVariantMedia(variantId: string) {
    const variant = await this.prisma.productVariant.findUnique({ where: { id: variantId }, select: { id: true } });
    if (!variant) throw new NotFoundException('Không tìm thấy biến thể sản phẩm.');
    const media = await this.prisma.productMedia.findMany({ where: { variantId }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
    return Promise.all(media.map(async item => ({ ...item, url: await this.storage.signedUrl(item.objectKey), objectKey: undefined })));
  }

  async uploadVariantMedia(variantId: string, kind: string | undefined, sortOrderValue: string | undefined, file: Express.Multer.File | undefined) {
    const variant = await this.prisma.productVariant.findUnique({ where: { id: variantId }, select: { id: true, productId: true } });
    if (!variant) throw new NotFoundException('Không tìm thấy biến thể sản phẩm.');
    if (kind !== 'IMAGE' && kind !== 'VIDEO') throw new BadRequestException('kind phải là IMAGE hoặc VIDEO.');
    this.storage.validate(file, kind);
    const mediaFile = file!;
    const sortOrder = sortOrderValue === undefined ? 0 : Number(sortOrderValue);
    if (!Number.isInteger(sortOrder) || sortOrder < 0) throw new BadRequestException('sortOrder phải là số nguyên không âm.');
    const objectKey = this.storage.createObjectKey('products', variantId, mediaFile.mimetype);
    await this.storage.put(objectKey, mediaFile);
    try {
      const media = await this.prisma.productMedia.create({ data: { productId: variant.productId, variantId, type: kind, objectKey, originalName: mediaFile.originalname, mimeType: mediaFile.mimetype, sizeBytes: mediaFile.size, sortOrder } });
      return { ...media, url: await this.storage.signedUrl(objectKey), objectKey: undefined };
    } catch (error) { await this.storage.remove(objectKey).catch(() => undefined); throw error; }
  }

  async uploadProductMedia(productId: string, kind: string | undefined, sortOrderValue: string | undefined, file: Express.Multer.File | undefined) {
    if (kind !== 'IMAGE' && kind !== 'VIDEO') throw new BadRequestException('kind phải là IMAGE hoặc VIDEO.');
    this.storage.validate(file, kind);
    const mediaFile = file!;
    const sortOrder = sortOrderValue === undefined ? 0 : Number(sortOrderValue);
    if (!Number.isInteger(sortOrder) || sortOrder < 0) throw new BadRequestException('sortOrder phải là số nguyên không âm.');
    if (!(await this.prisma.product.findUnique({ where: { id: productId }, select: { id: true } }))) {
      throw new NotFoundException('Không tìm thấy sản phẩm.');
    }

    const objectKey = this.storage.createObjectKey('products', productId, mediaFile.mimetype);
    await this.storage.put(objectKey, mediaFile);
    try {
      const media = await this.prisma.productMedia.create({
        data: {
          productId,
          type: kind,
          objectKey,
          originalName: mediaFile.originalname,
          mimeType: mediaFile.mimetype,
          sizeBytes: mediaFile.size,
          sortOrder,
        },
      });
      return { ...media, url: await this.storage.signedUrl(objectKey), objectKey: undefined };
    } catch (error) {
      await this.storage.remove(objectKey).catch(() => undefined);
      throw error;
    }
  }

  async removeProductMedia(mediaId: string) {
    const media = await this.prisma.productMedia.findUnique({ where: { id: mediaId } });
    if (!media) throw new NotFoundException('Không tìm thấy media sản phẩm.');
    await this.prisma.productMedia.delete({ where: { id: mediaId } });
    await this.storage.remove(media.objectKey).catch(() => undefined);
    return { ok: true };
  }
}
