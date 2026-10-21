import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Client } from 'minio';

export type UploadKind = 'AVATAR' | 'IMAGE' | 'VIDEO';

const RULES: Record<UploadKind, { mimeTypes: string[]; maxBytes: number }> = {
  AVATAR: { mimeTypes: ['image/jpeg', 'image/png', 'image/webp'], maxBytes: 5 * 1024 * 1024 },
  IMAGE: { mimeTypes: ['image/jpeg', 'image/png', 'image/webp'], maxBytes: 10 * 1024 * 1024 },
  VIDEO: { mimeTypes: ['video/mp4', 'video/webm'], maxBytes: 100 * 1024 * 1024 },
};

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
};

function hasExpectedSignature(file: Express.Multer.File) {
  const bytes = file.buffer;
  switch (file.mimetype) {
    case 'image/jpeg':
      return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case 'image/png':
      return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case 'image/webp':
      return bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
    case 'video/mp4':
      return bytes.length >= 12 && bytes.toString('ascii', 4, 8) === 'ftyp';
    case 'video/webm':
      return bytes.length >= 4 && bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
    default:
      return false;
  }
}

@Injectable()
export class StorageService {
  private client?: Client;
  private readonly bucket: string;
  private readonly urlTtlSeconds: number;
  private bucketReady?: Promise<void>;

  constructor() {
    this.bucket = process.env.MINIO_BUCKET ?? 'how2choose-media';
    this.urlTtlSeconds = Number(process.env.MEDIA_URL_TTL_SECONDS ?? 900);
  }

  private getClient() {
    if (this.client) return this.client;
    const endPoint = process.env.MINIO_ENDPOINT;
    const accessKey = process.env.MINIO_ACCESS_KEY;
    const secretKey = process.env.MINIO_SECRET_KEY;
    if (!endPoint || !accessKey || !secretKey) {
      throw new Error('MINIO_ENDPOINT, MINIO_ACCESS_KEY and MINIO_SECRET_KEY are required.');
    }
    this.client = new Client({
      endPoint,
      port: Number(process.env.MINIO_PORT ?? 9000),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey,
      secretKey,
    });
    return this.client;
  }

  private async ensureBucket() {
    if (!this.bucketReady) {
      this.bucketReady = (async () => {
        const client = this.getClient();
        if (!(await client.bucketExists(this.bucket))) await client.makeBucket(this.bucket);
      })().catch(error => {
        this.bucketReady = undefined;
        throw error;
      });
    }
    await this.bucketReady;
  }

  validate(file: Express.Multer.File | undefined, kind: UploadKind) {
    if (!file) throw new BadRequestException('Vui lòng chọn file để tải lên.');
    const rule = RULES[kind];
    if (!rule.mimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(`Định dạng file không được hỗ trợ cho ${kind.toLowerCase()}.`);
    }
    if (file.size <= 0 || file.size > rule.maxBytes) {
      throw new BadRequestException(`Kích thước file phải từ 1 byte đến ${rule.maxBytes / 1024 / 1024} MB.`);
    }
    if (!hasExpectedSignature(file)) {
      throw new BadRequestException('Nội dung file không khớp với định dạng đã khai báo.');
    }
  }

  createObjectKey(scope: 'avatars' | 'recipients' | 'products', ownerId: string, mimeType: string) {
    return `${scope}/${ownerId}/${randomUUID()}.${EXTENSIONS[mimeType]}`;
  }

  async put(objectKey: string, file: Express.Multer.File) {
    await this.ensureBucket();
    await this.getClient().putObject(this.bucket, objectKey, file.buffer, file.size, {
      'Content-Type': file.mimetype,
      'Cache-Control': 'private, max-age=3600',
    });
  }

  async remove(objectKey: string) {
    await this.ensureBucket();
    await this.getClient().removeObject(this.bucket, objectKey);
  }

  async signedUrl(objectKey: string) {
    await this.ensureBucket();
    return this.getClient().presignedGetObject(this.bucket, objectKey, this.urlTtlSeconds);
  }
}
