import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public, JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard, Roles } from './roles.guard';
import { ROLES } from '@sapls/shared';

@Controller('v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body() registerDto: any) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  async login(@Body() loginDto: any) {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('dev-login')
  async devLogin(@Body('role') role?: 'ADMIN' | 'TEACHER' | 'STUDENT') {
    return this.authService.devLogin(role || 'ADMIN');
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Request() req: any) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN, ROLES.SUPER_ADMIN)
  @Get('admin-only')
  adminOnly() {
    return { message: 'This is an admin only route' };
  }
}
