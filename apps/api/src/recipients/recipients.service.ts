import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecipientDto, UpdateRecipientDto } from './recipient.dto';
function cleanList(values:string[]):string[] {
  const list=values.map(v=>v.trim()).filter(Boolean);
  if(list.some(v=>v.length>100)) throw new BadRequestException('Each item must be 100 characters or fewer');
  return [...new Set(list)];
}
@Injectable()
export class RecipientsService {
  constructor(private readonly prisma:PrismaService) {}
  list(ownerId:string) { return this.prisma.recipient.findMany({where:{ownerId},orderBy:{createdAt:'desc'}}); }
  async get(ownerId:string,id:string) {
    const recipient=await this.prisma.recipient.findFirst({where:{id,ownerId}});
    if(!recipient) throw new NotFoundException('Recipient not found');
    return recipient;
  }
  create(ownerId:string,dto:CreateRecipientDto) {
    const displayName=dto.displayName.trim();
    if(!displayName) throw new BadRequestException('Display name is required');
    return this.prisma.recipient.create({data:{ownerId,displayName,relationship:dto.relationship?.trim() || null,interests:cleanList(dto.interests),dislikes:cleanList(dto.dislikes),notes:dto.notes?.trim() || null}});
  }
  async update(ownerId:string,id:string,dto:UpdateRecipientDto) {
    await this.get(ownerId,id);
    if(dto.displayName!==undefined && !dto.displayName.trim()) throw new BadRequestException('Display name is required');
    const data={
      ...(dto.displayName!==undefined?{displayName:dto.displayName.trim()}:{}),
      ...(dto.relationship!==undefined?{relationship:dto.relationship.trim() || null}:{}),
      ...(dto.interests!==undefined?{interests:cleanList(dto.interests)}:{}),
      ...(dto.dislikes!==undefined?{dislikes:cleanList(dto.dislikes)}:{}),
      ...(dto.notes!==undefined?{notes:dto.notes.trim() || null}:{}),
    };
    const result=await this.prisma.recipient.updateMany({where:{id,ownerId},data});
    if(result.count===0) throw new NotFoundException('Recipient not found');
    return this.get(ownerId,id);
  }
}
