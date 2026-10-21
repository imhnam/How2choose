import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RecipientAddressDto, UpdateRecipientDto } from '../src/recipients/recipient.dto';

describe('Recipient address validation', () => {
  it('validates optional recipient phone numbers', async () => {
    const valid = plainToInstance(UpdateRecipientDto, { phone: '0912345678' });
    await expect(validate(valid)).resolves.toEqual([]);

    const invalid = plainToInstance(UpdateRecipientDto, { phone: '123' });
    expect(await validate(invalid)).not.toHaveLength(0);
  });

  it('accepts an optional ISO calendar birthday and rejects impossible dates', async () => {
    const valid = plainToInstance(UpdateRecipientDto, { birthday: '2000-02-29' });
    await expect(validate(valid)).resolves.toEqual([]);

    const invalid = plainToInstance(UpdateRecipientDto, { birthday: '2001-02-29' });
    expect(await validate(invalid)).not.toHaveLength(0);
  });

  it('accepts legacy address codes from the address selector', async () => {
    const dto = plainToInstance(UpdateRecipientDto, {
      address: {
        version: 'legacy',
        provinceCode: 1,
        districtCode: 2,
        wardCode: 3,
        addressLine: '12 Nguyễn Trãi',
      },
    });

    await expect(validate(dto, { whitelist: true, forbidNonWhitelisted: true })).resolves.toEqual([]);
    expect(dto.address).toBeInstanceOf(RecipientAddressDto);
  });

  it('rejects the display model shape instead of accepting unvalidated place objects', async () => {
    const dto = plainToInstance(UpdateRecipientDto, {
      address: {
        version: 'legacy',
        province: { code: 1, name: 'Hà Nội' },
        district: { code: 2, name: 'Ba Đình' },
        ward: { code: 3, name: 'Phúc Xá' },
        addressLine: '12 Nguyễn Trãi',
      },
    });

    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    expect(errors).toHaveLength(1);
    expect(errors[0].children?.map(error => error.property)).toEqual(expect.arrayContaining(['province', 'district', 'ward', 'provinceCode', 'wardCode']));
  });
});
