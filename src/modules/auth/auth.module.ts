import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AdminAuthController } from './admin-auth.controller';
import { AuthService } from './auth.service';
import { CustomerAuthController } from './customer-auth.controller';

@Module({
  // global: true so the app-wide JwtAuthGuard can inject JwtService.
  imports: [JwtModule.register({ global: true })],
  controllers: [CustomerAuthController, AdminAuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
