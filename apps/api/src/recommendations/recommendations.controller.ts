import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthRequest } from '../auth/auth.types';
import { SessionGuard } from '../auth/session.guard';
import { CreateRecommendationDto } from './recommendation.dto';
import { RecommendationsService } from './recommendations.service';

@ApiTags('recommendations')
@Controller('recommendations')
@UseGuards(SessionGuard)
export class RecommendationsController {
  constructor(private readonly recommendations: RecommendationsService) {}

  @Get('conversation')
  conversation(@Req() req: AuthRequest, @Query('recipientId') recipientId: string, @Query('before') before?: string) {
    return this.recommendations.getConversation(req.authUser!.id, recipientId, before);
  }

  @Post()
  recommend(@Req() req: AuthRequest, @Body() body: CreateRecommendationDto) {
    return this.recommendations.recommend(req.authUser!.id, body);
  }
}
