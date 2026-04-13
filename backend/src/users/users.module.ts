import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UserProfile } from './entities/user-profile.entity';
import { Purchase } from '../policies/entities/purchase.entity';
import { Quote } from '../policies/entities/quote.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserProfile, Purchase, Quote])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
