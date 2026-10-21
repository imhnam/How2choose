import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export const GIFT_OCCASIONS = ['birthday', 'anniversary', 'holiday', 'thank-you', 'other'] as const;
export type GiftOccasion = typeof GIFT_OCCASIONS[number];

export class CreateRecommendationDto {
  @IsString() @MaxLength(100) recipientId!: string;
  @IsOptional() @IsString() @MaxLength(100) conversationId?: string;
  @IsInt() @Min(50000) @Max(20000000) budgetVnd!: number;
  @IsIn(GIFT_OCCASIONS) occasion!: GiftOccasion;
  @IsOptional() @IsString() @MaxLength(500) request?: string;
}
