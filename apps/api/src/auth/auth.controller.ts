import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SsoService } from './sso.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly ssoService: SsoService,
  ) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('sso/login')
  ssoLogin(@Query('state') state?: string) {
    return this.ssoService.getLoginUrl(state);
  }

  @Post('sso/callback')
  ssoCallback(@Body() body: { code: string; email?: string }) {
    return this.ssoService.handleCallback(body);
  }
}