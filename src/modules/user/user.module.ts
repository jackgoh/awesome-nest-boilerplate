import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { IAMModule } from '../iam/iam.module';
import { UserController } from './user.controller';
import { UserEntity } from './user.entity';
import { UserService } from './user.service';
import { UserSettingsEntity } from './user-settings.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, UserSettingsEntity]),
    IAMModule,
  ],
  controllers: [UserController],
  exports: [UserService],
  providers: [UserService],
})
export class UserModule {}
