import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { TokenSubject } from '@prisma/client';
import { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CustomerAuth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { AuthTokensDto } from './dto/auth-response.dto';
import {
  LoginCustomerDto,
  RefreshTokenDto,
  RegisterCustomerDto,
  UpdateCustomerProfileDto,
} from './dto/customer-auth.dto';

@ApiTags('Auth — Customer')
@Controller('auth/customer')
export class CustomerAuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Create a customer account' })
  @ApiOkResponse({ type: AuthTokensDto })
  register(@Body() dto: RegisterCustomerDto) {
    return this.authService.registerCustomer(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in with email or phone number' })
  @ApiOkResponse({ type: AuthTokensDto })
  login(@Body() dto: LoginCustomerDto) {
    return this.authService.loginCustomer(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange a refresh token for a new token pair' })
  @ApiOkResponse({ type: AuthTokensDto })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken, TokenSubject.CUSTOMER);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke a refresh token' })
  logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto.refreshToken);
  }

  @CustomerAuth()
  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Get the signed-in customer profile' })
  me(@CurrentUser() user: AuthUser) {
    return this.authService.getCustomerProfile(user.id);
  }

  @CustomerAuth()
  @ApiBearerAuth()
  @Patch('me')
  @ApiOperation({ summary: 'Update profile and default delivery address' })
  updateMe(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateCustomerProfileDto,
  ) {
    return this.authService.updateCustomerProfile(user.id, dto);
  }
}
