import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { TokenSubject } from '@prisma/client';
import { AdminAuth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AuthUser } from '../../common/interfaces/auth-user.interface';
import { AuthService } from './auth.service';
import { LoginAdminDto } from './dto/admin-auth.dto';
import { AuthTokensDto } from './dto/auth-response.dto';
import { RefreshTokenDto } from './dto/customer-auth.dto';

@ApiTags('Auth — Admin')
@Controller('auth/admin')
export class AdminAuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in to the admin dashboard' })
  @ApiOkResponse({ type: AuthTokensDto })
  login(@Body() dto: LoginAdminDto) {
    return this.authService.loginAdmin(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange a refresh token for a new token pair' })
  @ApiOkResponse({ type: AuthTokensDto })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken, TokenSubject.ADMIN);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke a refresh token' })
  logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto.refreshToken);
  }

  @AdminAuth()
  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Get the signed-in admin profile and role' })
  me(@CurrentUser() user: AuthUser) {
    return this.authService.getAdminProfile(user.id);
  }
}
