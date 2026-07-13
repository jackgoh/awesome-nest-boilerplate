import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PermissionEntity } from './entities/permission.entity';
import { RoleEntity } from './entities/role.entity';
import { IAMController } from './iam.controller';
import { IAMService } from './iam.service';

@Module({
  imports: [TypeOrmModule.forFeature([RoleEntity, PermissionEntity])],
  controllers: [IAMController],
  providers: [IAMService],
  exports: [IAMService],
})
export class IAMModule {}
