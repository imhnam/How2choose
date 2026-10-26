import { Body, Controller, Delete, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthRequest } from '../auth/auth.types';
import { SessionGuard } from '../auth/session.guard';
import { CreateRecommendationDto } from './recommendation.dto';
import { RecommendationsService } from './recommendations.service';
import { UserThrottlerGuard } from './user-throttler.guard';

@ApiTags('recommendations')
@Controller('recommendations')
@UseGuards(SessionGuard, UserThrottlerGuard)
export class RecommendationsController {
  constructor(private readonly recommendations: RecommendationsService) {}

  @Get('conversation')
  conversation(@Req() req: AuthRequest, @Query('recipientId') recipientId: string, @Query('before') before?: string) {
    return this.recommendations.getConversation(req.authUser!.id, recipientId, before);
  }

  @Delete('conversation')
  clearConversation(@Req() req: AuthRequest, @Query('recipientId') recipientId: string) {
    return this.recommendations.clearConversation(req.authUser!.id, recipientId);
  }

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  recommend(@Req() req: AuthRequest, @Body() body: CreateRecommendationDto) {
    return this.recommendations.recommend(req.authUser!.id, body);
  }
}
