import { Module } from '@nestjs/common';
import { AdminsModule } from '../admins/admins.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [AdminsModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
