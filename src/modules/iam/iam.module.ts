import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuditModule } from '../audit/audit.module';
import { OutboxModule } from '../outbox/outbox.module';
import { UserEntity } from '../user/user.entity';
import { PermissionEntity } from './entities/permission.entity';
import { RoleEntity } from './entities/role.entity';
import { AuthorizationRevisionService } from './authorization-revision.service';
import { IAMController } from './iam.controller';
import { IamPolicyService } from './iam-policy.service';
import { IAMService } from './iam.service';
import { UserLifecycleService } from './user-lifecycle.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([RoleEntity, PermissionEntity, UserEntity]),
    AuditModule,
    OutboxModule,
  ],
  controllers: [IAMController],
  providers: [
    AuthorizationRevisionService,
    IamPolicyService,
    IAMService,
    UserLifecycleService,
  ],
  exports: [IAMService, UserLifecycleService],
})
export class IAMModule {}
