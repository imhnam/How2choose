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
    });
    await expect(validate(dto, { whitelist: true, forbidNonWhitelisted: true })).resolves.toEqual([]);
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
