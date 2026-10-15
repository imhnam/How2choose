import { Body, Controller, Get, Post, Query, Req, Res, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { CredentialsDto } from './auth.dto';
import { AuthRequest, GOOGLE_STATE_COOKIE, SESSION_COOKIE } from './auth.types';
import { GoogleService } from './google.service';
import { SessionGuard } from './session.guard';
import { newToken } from './auth.utils';
const webOrigin=()=>process.env.WEB_ORIGIN ?? 'http://localhost:3000';
const cookieSecure=()=>process.env.NODE_ENV==='production';
function setSession(res:Response, token:string, expiresAt:Date) {
  res.cookie(SESSION_COOKIE,token,{httpOnly:true,secure:cookieSecure(),sameSite:'lax',path:'/',expires:expiresAt});
}
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth:AuthService,private readonly google:GoogleService) {}
  @Post('register')
  async register(@Body() body:CredentialsDto,@Res({passthrough:true}) res:Response) {
    const result=await this.auth.register(body.identifier,body.password);setSession(res,result.token,result.expiresAt);return {user:result.user};
  }
  @Post('login')
  async login(@Body() body:CredentialsDto,@Res({passthrough:true}) res:Response) {
    const result=await this.auth.login(body.identifier,body.password);setSession(res,result.token,result.expiresAt);return {user:result.user};
  }
  @Post('logout')
  async logout(@Req() req:Request,@Res({passthrough:true}) res:Response) {
    await this.auth.logout(req.cookies?.[SESSION_COOKIE]);res.clearCookie(SESSION_COOKIE,{path:'/'});return {ok:true};
  }
  @Get('me') @UseGuards(SessionGuard)
  me(@Req() req:AuthRequest) { return {user:req.authUser}; }
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
      setSession(res,session.token,session.expiresAt);
      return res.redirect(webOrigin()+'/recipients');
    } catch(e) {
      const reason=(e as {status?:number}).status===409?'account_exists':'google_failed';
      return res.redirect(webOrigin()+'/login?error='+reason);
    }
  }
}
