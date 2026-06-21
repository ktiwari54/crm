import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PortalTokenGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token =
      request.headers['x-portal-token'] ??
      request.query?.token ??
      this.extractBearerToken(request.headers.authorization);

    if (!token || typeof token !== 'string') {
      throw new UnauthorizedException('Portal token required');
    }

    const access = await this.prisma.portalAccess.findFirst({
      where: { accessToken: token, isActive: true },
      include: { account: true },
    });

    if (!access) {
      throw new UnauthorizedException('Invalid portal token');
    }

    await this.prisma.portalAccess.update({
      where: { id: access.id },
      data: { lastLoginAt: new Date() },
    });

    request.portalAccess = access;
    return true;
  }

  private extractBearerToken(auth?: string): string | undefined {
    if (!auth) return undefined;
    const [scheme, value] = auth.split(' ');
    if (scheme?.toLowerCase() === 'portal' && value) return value;
    return undefined;
  }
}