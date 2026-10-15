import 'dotenv/config';
import { BadRequestException } from '@nestjs/common';
import { StorageService } from '../src/media/storage.service';

function file(buffer: Buffer, mimetype: string): Express.Multer.File {
  return {
    buffer,
    mimetype,
    size: buffer.length,
    originalname: 'test-file',
    fieldname: 'file',
    encoding: '7bit',
    stream: undefined as never,
    destination: '',
    filename: '',
    path: '',
  };
}

describe('StorageService file validation', () => {
  const storage = new StorageService();

  it('accepts a PNG signature for an avatar', () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    expect(() => storage.validate(file(png, 'image/png'), 'AVATAR')).not.toThrow();
  });

  it('rejects a spoofed image MIME type', () => {
    expect(() => storage.validate(file(Buffer.from('not an image'), 'image/png'), 'AVATAR')).toThrow(BadRequestException);
  });

  it('rejects video content for avatars', () => {
    const mp4 = Buffer.from([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0, 0, 0, 0]);
    expect(() => storage.validate(file(mp4, 'video/mp4'), 'AVATAR')).toThrow(BadRequestException);
  });
});
