import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../media/storage.service';
import { LocationsService } from '../locations/locations.service';
import { CreateRecipientDto, RecipientAddressDto, UpdateRecipientDto } from './recipient.dto';
import { RecipientModel } from '../generated/prisma/models/Recipient';

function cleanList(values:string[]):string[] {
  const list=values.map(v=>v.trim()).filter(Boolean);
  if(list.some(v=>v.length>100)) throw new BadRequestException('Each item must be 100 characters or fewer');
  return [...new Set(list)];
}

const emptyAddress = {
  addressVersion: null,
  addressProvinceCode: null,
  addressProvinceName: null,
  addressDistrictCode: null,
  addressDistrictName: null,
  addressWardCode: null,
  addressWardName: null,
  addressLine: null,
};

@Injectable()
export class RecipientsService {
  constructor(private readonly prisma:PrismaService, private readonly storage:StorageService, private readonly locations:LocationsService) {}

  private async serialize(recipient: RecipientModel) {
    const { avatarObjectKey, birthday, addressVersion, addressProvinceCode, addressProvinceName, addressDistrictCode, addressDistrictName, addressWardCode, addressWardName, addressLine, ...profile } = recipient;
    const address = addressVersion && addressProvinceCode && addressProvinceName && addressWardCode && addressWardName && addressLine
      ? {
          version: addressVersion,
          province: { code: addressProvinceCode, name: addressProvinceName },
          district: addressDistrictCode && addressDistrictName ? { code: addressDistrictCode, name: addressDistrictName } : null,
          ward: { code: addressWardCode, name: addressWardName },
          addressLine,
        }
      : null;
    return { ...profile, birthday: birthday?.toISOString().slice(0, 10) ?? null, address, avatarUrl: avatarObjectKey ? await this.storage.signedUrl(avatarObjectKey) : null };
  }

  private async addressData(address: RecipientAddressDto | null | undefined) {
    if (address === undefined) return undefined;
    return address ? this.locations.resolveAddress(address) : emptyAddress;
  }

  async list(ownerId:string) {
    const recipients = await this.prisma.recipient.findMany({where:{ownerId},orderBy:{createdAt:'desc'}});
    return Promise.all(recipients.map(recipient => this.serialize(recipient)));
  }

  private async findOwned(ownerId:string,id:string) {
    const recipient=await this.prisma.recipient.findFirst({where:{id,ownerId}});
    if(!recipient) throw new NotFoundException('Recipient not found');
    return recipient;
  }

  async get(ownerId:string,id:string) {
    return this.serialize(await this.findOwned(ownerId,id));
  }

  async create(ownerId:string,dto:CreateRecipientDto) {
    const displayName=dto.displayName.trim();
    if(!displayName) throw new BadRequestException('Display name is required');
    const address = await this.addressData(dto.address);
    const recipient = await this.prisma.recipient.create({data:{ownerId,displayName,phone:dto.phone?.trim() || null,relationship:dto.relationship?.trim() || null,birthday:dto.birthday?new Date(`${dto.birthday}T00:00:00.000Z`):null,interests:cleanList(dto.interests),dislikes:cleanList(dto.dislikes),notes:dto.notes?.trim() || null,...address}});
    return this.serialize(recipient);
  }

  async update(ownerId:string,id:string,dto:UpdateRecipientDto) {
    await this.findOwned(ownerId,id);
    if(dto.displayName!==undefined && !dto.displayName.trim()) throw new BadRequestException('Display name is required');
    const address = await this.addressData(dto.address);
    const data={
      ...(dto.displayName!==undefined?{displayName:dto.displayName.trim()}:{}),
      ...(dto.phone!==undefined?{phone:dto.phone?.trim() || null}:{}),
      ...(dto.relationship!==undefined?{relationship:dto.relationship.trim() || null}:{}),
      ...(dto.birthday!==undefined?{birthday:dto.birthday?new Date(`${dto.birthday}T00:00:00.000Z`):null}:{}),
      ...(dto.interests!==undefined?{interests:cleanList(dto.interests)}:{}),
      ...(dto.dislikes!==undefined?{dislikes:cleanList(dto.dislikes)}:{}),
      ...(dto.notes!==undefined?{notes:dto.notes.trim() || null}:{}),
      ...(address ?? {}),
    };
    const result=await this.prisma.recipient.updateMany({where:{id,ownerId},data});
    if(result.count===0) throw new NotFoundException('Recipient not found');
    return this.get(ownerId,id);
  }
}
