import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SsoService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  getLoginUrl(state?: string) {
    const tenantId = this.config.get<string>('SSO_AZURE_TENANT_ID') ?? 'common';
    const clientId = this.config.get<string>('SSO_AZURE_CLIENT_ID') ?? 'crm-demo-client';
    const redirectUri =
      this.config.get<string>('SSO_REDIRECT_URI') ??
      'http://localhost:3000/login/sso-callback';
    const nonce = state ?? `crm-${Date.now()}`;

    const authorizationUrl =
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize` +
      `?client_id=${encodeURIComponent(clientId)}` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent('openid profile email')}` +
      `&state=${encodeURIComponent(nonce)}`;

    return {
      provider: 'azure_ad',
      authorizationUrl,
      redirectUri,
      stubMode: !this.config.get<string>('SSO_AZURE_CLIENT_SECRET'),
      demoHint: 'Use demo code "azure-demo-code" with POST /auth/sso/callback',
    };
  }

  async handleCallback(body: { code: string; email?: string }) {
    const isDemo =
      body.code === 'azure-demo-code' ||
      body.code === 'demo' ||
      !this.config.get<string>('SSO_AZURE_CLIENT_SECRET');

    if (!isDemo) {
      throw new UnauthorizedException(
        'Real Azure AD token exchange not configured — set SSO_AZURE_CLIENT_SECRET or use demo code',
      );
    }

    const email = body.email ?? 'admin@crm.local';
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('SSO user not provisioned in CRM');
    }

    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      provider: 'azure_ad',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      accessToken,
    };
  }
}