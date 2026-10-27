import { Body, Controller, Get, Patch, Post, Query, Req, Res, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { CredentialsDto, RegisterDto, SaveAccountAddressDto, UpdateProfileDto } from './auth.dto';
import { AuthRequest, GOOGLE_STATE_COOKIE, SESSION_COOKIE } from './auth.types';
import { clearSessionCookie, setSessionCookie } from './auth.cookies';
import { GoogleService } from './google.service';
import { SessionGuard } from './session.guard';
import { newToken } from './auth.utils';
const webOrigin=()=>process.env.WEB_ORIGIN ?? 'http://localhost:3000';
const cookieSecure=()=>process.env.NODE_ENV==='production';
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth:AuthService,private readonly google:GoogleService) {}
  @Post('register')
  async register(@Body() body:RegisterDto,@Res({passthrough:true}) res:Response) {
    const result=await this.auth.register(body.identifier,body.password,body.displayName);setSessionCookie(res,result.token,result.expiresAt);return {user:result.user};
  }
  @Post('login')
  async login(@Body() body:CredentialsDto,@Res({passthrough:true}) res:Response) {
    const result=await this.auth.login(body.identifier,body.password);setSessionCookie(res,result.token,result.expiresAt);return {user:result.user};
  }
  @Post('logout')
  async logout(@Req() req:Request,@Res({passthrough:true}) res:Response) {
    await this.auth.logout(req.cookies?.[SESSION_COOKIE]);clearSessionCookie(res);return {ok:true};
  }
  @Get('me') @UseGuards(SessionGuard)
  me(@Req() req:AuthRequest) { return {user:req.authUser}; }
  @Patch('me') @UseGuards(SessionGuard)
  async updateMe(@Req() req:AuthRequest,@Body() body:UpdateProfileDto) {
    return {user:await this.auth.updateProfile(req.authUser!.id,body.displayName,body.birthday)};
  }
  @Get('me/address') @UseGuards(SessionGuard)
  async accountAddress(@Req() req:AuthRequest) {
    return {address:await this.auth.accountAddress(req.authUser!.id)};
  }
  @Post('me/address') @UseGuards(SessionGuard)
  async saveAccountAddress(@Req() req:AuthRequest,@Body() body:SaveAccountAddressDto) {
    return {address:await this.auth.saveAccountAddress(req.authUser!.id,body)};
  }
  @Get('providers')
  providers() { return {google:this.google.isConfigured()}; }
  @Get('google/start')
  googleStart(@Res() res:Response) {
    const state=newToken();
    res.cookie(GOOGLE_STATE_COOKIE,state,{httpOnly:true,secure:cookieSecure(),sameSite:'lax',path:'/api/auth/google',maxAge:10*60*1000});
    return res.redirect(this.google.authorizationUrl(state));
  }
  @Get('google/callback')
  async googleCallback(@Query('code') code:string,@Query('state') state:string,@Req() req:Request,@Res() res:Response) {
    const expected=req.cookies?.[GOOGLE_STATE_COOKIE];
    res.clearCookie(GOOGLE_STATE_COOKIE,{path:'/api/auth/google'});
    if(!code || !state || !expected || state!==expected) throw new BadRequestException('Google OAuth state kh?ng h?p l?');
    try {
      const identity=await this.google.identity(code);
      const session=await this.auth.googleUser(identity.subject,identity.email,identity.displayName);
      setSessionCookie(res,session.token,session.expiresAt);
      return res.redirect(webOrigin()+'/recipients');
    } catch(e) {
      const reason=(e as {status?:number}).status===409?'account_exists':'google_failed';
      return res.redirect(webOrigin()+'/login?error='+reason);
    }
  }
}
