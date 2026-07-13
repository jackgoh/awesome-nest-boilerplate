import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuditModule } from '../audit/audit.module';
import { OutboxModule } from '../outbox/outbox.module';
import { UserEntity } from '../user/user.entity';
import { PermissionEntity } from './entities/permission.entity';
import { RoleEntity } from './entities/role.entity';
import { IAMController } from './iam.controller';
import { IAMService } from './iam.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([RoleEntity, PermissionEntity, UserEntity]),
    AuditModule,
    OutboxModule,
  ],
  controllers: [IAMController],
  providers: [IAMService],
  exports: [IAMService],
})
export class IAMModule {}
