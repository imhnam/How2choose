import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
@Injectable()
export class GoogleService {
  isConfigured() { return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI); }
  client() {
    if(!this.isConfigured()) throw new ServiceUnavailableException('Google Login ch?a ???c c?u h?nh');
    return new OAuth2Client(process.env.GOOGLE_CLIENT_ID,process.env.GOOGLE_CLIENT_SECRET,process.env.GOOGLE_REDIRECT_URI);
  }
  authorizationUrl(state:string) { return this.client().generateAuthUrl({scope:['openid','email','profile'],state,prompt:'select_account'}); }
  async identity(code:string) {
    const client=this.client();
    const {tokens}=await client.getToken(code);
    if(!tokens.id_token) throw new UnauthorizedException('Google kh?ng tr? ID token');
    const ticket=await client.verifyIdToken({idToken:tokens.id_token,audience:process.env.GOOGLE_CLIENT_ID});
    const claims=ticket.getPayload();
    if(!claims?.sub || !claims.email || claims.email_verified!==true) throw new UnauthorizedException('Google email ch?a ???c x?c minh');
    return {subject:claims.sub,email:claims.email,displayName:claims.name};
  }
}
