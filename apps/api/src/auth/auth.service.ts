import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from './auth.types';
import { hashPassword, newToken, normalizeIdentifier, tokenHash, verifyPassword } from './auth.utils';
const SESSION_DAYS = 30;
@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}
  async register(identifier: string, password: string) {
    let key: { email?: string; phone?: string };
    try { key=normalizeIdentifier(identifier); } catch(e) { throw new BadRequestException((e as Error).message); }
    const existing=await this.prisma.user.findFirst({ where: { OR: [key.email ? {email:key.email}: {}, key.phone ? {phone:key.phone}: {}].filter(x=>Object.keys(x).length) } });
    if(existing) throw new ConflictException('T?i kho?n ?? t?n t?i');
    const user=await this.prisma.user.create({ data: { ...key, passwordHash: await hashPassword(password) } }).catch((e: unknown)=>{
      if((e as {code?:string}).code==='P2002') throw new ConflictException('T?i kho?n ?? t?n t?i');
      throw e;
    });
    return this.createSession(user.id);
  }
  async login(identifier: string, password: string) {
    let key: { email?: string; phone?: string };
    try { key=normalizeIdentifier(identifier); } catch { throw new UnauthorizedException('Th?ng tin ??ng nh?p kh?ng ??ng'); }
    const user=await this.prisma.user.findFirst({where:key});
    if(!user?.passwordHash || !(await verifyPassword(password,user.passwordHash))) throw new UnauthorizedException('Th?ng tin ??ng nh?p kh?ng ??ng');
    return this.createSession(user.id);
  }
  async createSession(userId: string) {
    const token=newToken();
    const expiresAt=new Date(Date.now()+SESSION_DAYS*24*60*60*1000);
    await this.prisma.session.create({data:{userId,tokenHash:tokenHash(token),expiresAt}});
    const user=await this.prisma.user.findUniqueOrThrow({where:{id:userId}});
    return { token, expiresAt, user: this.publicUser(user) };
  }
  async fromToken(token?: string): Promise<AuthUser | null> {
    if(!token) return null;
    const session=await this.prisma.session.findUnique({where:{tokenHash:tokenHash(token)},include:{user:true}});
    if(!session || session.expiresAt<=new Date()) return null;
    return this.publicUser(session.user);
  }
  async logout(token?: string) { if(token) await this.prisma.session.deleteMany({where:{tokenHash:tokenHash(token)}}); }
  async googleUser(subject: string, email: string, displayName?: string) {
    const existing=await this.prisma.user.findUnique({where:{googleSub:subject}});
    if(existing) return this.createSession(existing.id);
    const normalized=email.toLowerCase();
    if(await this.prisma.user.findUnique({where:{email:normalized}})) throw new ConflictException('Email n?y ?? c? t?i kho?n. ??ng nh?p b?ng m?t kh?u; li?n k?t Google s? ???c h? tr? sau.');
    const user=await this.prisma.user.create({data:{googleSub:subject,email:normalized,displayName}}).catch((e:unknown)=>{
      if((e as {code?:string}).code==='P2002') throw new ConflictException('Email n?y ?? c? t?i kho?n');
      throw e;
    });
    return this.createSession(user.id);
  }
  publicUser(user: {id:string;email:string|null;phone:string|null;displayName:string|null}): AuthUser {
    return {id:user.id,email:user.email,phone:user.phone,displayName:user.displayName};
  }
}
