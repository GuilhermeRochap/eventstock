import { Controller, Post, Body, UseGuards, Req, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthenticatedRequest } from './types/authenticated-request.type';
import { SignupDto } from './dto/signup.dto';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/role.decorator';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';
import { BecomeOrganizerDto } from './dto/become-organizer.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserByAdminDto } from './dto/create-user-by-admin.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: AuthenticatedRequest) {
    return req.user;
  }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager')
  @Get('organizer-only-test')
  organizerOnlyTest(@Req() req: AuthenticatedRequest) {
    return {
      message: 'Acesso permitido apenas para organizador.',
      user: req.user,
    };
  }
  @UseGuards(JwtAuthGuard)
  @Post('become-organizer')
  async becomeOrganizer(
    @Req() req: AuthenticatedRequest,
    @Body() dto: BecomeOrganizerDto,
  ) {
    return this.authService.becomeOrganizer(req.user.userId, dto);
  }
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(
    @Req() req: AuthenticatedRequest,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(req.user.userId, dto.novaSenha);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('users')
  async createUserByAdmin(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateUserByAdminDto,
  ) {
    return this.authService.createUserByAdmin(req.user.companyId, dto);
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }
  @Post('logout')
  async logout(@Body() dto: LogoutDto) {
    return this.authService.logout(dto.refreshToken);
  }
}
