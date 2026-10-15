import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthRequest } from '../auth/auth.types';
import { SessionGuard } from '../auth/session.guard';
import { CreateRecipientDto, UpdateRecipientDto } from './recipient.dto';
import { RecipientsService } from './recipients.service';
@ApiTags('recipients') @Controller('recipients') @UseGuards(SessionGuard)
export class RecipientsController {
  constructor(private readonly recipients:RecipientsService) {}
  @Get() list(@Req() req:AuthRequest) { return this.recipients.list(req.authUser!.id); }
  @Get(':id') get(@Req() req:AuthRequest,@Param('id') id:string) { return this.recipients.get(req.authUser!.id,id); }
  @Post() create(@Req() req:AuthRequest,@Body() dto:CreateRecipientDto) { return this.recipients.create(req.authUser!.id,dto); }
  @Patch(':id') update(@Req() req:AuthRequest,@Param('id') id:string,@Body() dto:UpdateRecipientDto) { return this.recipients.update(req.authUser!.id,id,dto); }
}
