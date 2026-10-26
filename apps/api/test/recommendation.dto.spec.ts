import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateRecommendationDto } from '../src/recommendations/recommendation.dto';

describe('CreateRecommendationDto', () => {
  it('accepts a valid budget, occasion, and optional request', async () => {
    const dto = plainToInstance(CreateRecommendationDto, {
      recipientId: 'recipient-1',
      budgetVnd: 500000,
      occasion: 'birthday',
      request: 'Ưu tiên quà thủ công',
      idempotencyKey: 'b1f2c3',
    });
    await expect(validate(dto, { whitelist: true, forbidNonWhitelisted: true })).resolves.toEqual([]);
  });

  it('accepts the documented maximum budget of 20,000,000 VND', async () => {
    const dto = plainToInstance(CreateRecommendationDto, {
      recipientId: 'recipient-1',
      budgetVnd: 20000000,
      occasion: 'birthday',
    });
    await expect(validate(dto)).resolves.toEqual([]);
  });

  it('rejects an idempotency key longer than 100 characters', async () => {
    const dto = plainToInstance(CreateRecommendationDto, {
      recipientId: 'recipient-1',
      budgetVnd: 500000,
      occasion: 'birthday',
      idempotencyKey: 'x'.repeat(101),
    });
    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('rejects unsupported occasions and budgets outside allowed limits', async () => {
    const dto = plainToInstance(CreateRecommendationDto, {
      recipientId: 'recipient-1',
      budgetVnd: 100,
      occasion: 'random',
    });
    expect(await validate(dto)).not.toHaveLength(0);
  });
});
