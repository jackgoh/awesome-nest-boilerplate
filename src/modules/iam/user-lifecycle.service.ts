import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { type TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { type Repository } from 'typeorm';

import { generateHash, validateHash } from '../../common/utils';
import { ApiConfigService } from '../../shared/services/api-config.service';
import { type AuthenticatedUser } from '../../types/auth-user.type';
import { AuditService } from '../audit/audit.service';
import { OutboxService } from '../outbox/outbox.service';
import { AccountStatus } from '../user/account-status.enum';
import { UserEntity } from '../user/user.entity';
import { IamPolicyService } from './iam-policy.service';

@Injectable()
export class UserLifecycleService {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
    private readonly policy: IamPolicyService,
    private readonly auditService: AuditService,
    private readonly outboxService: OutboxService,
    private readonly configService: ApiConfigService,
  ) {}

  private get userRepository(): Repository<UserEntity> {
    return this.txHost.tx.getRepository(UserEntity);
  }

  suspend(
    actor: AuthenticatedUser,
    userId: Uuid,
    reason: string,
    correlationId: Uuid,
  ): Promise<void> {
    return this.txHost.withTransaction(async () => {
      const user = await this.requireUser(userId);
      const bypass = this.policy.assertCanManageAccount(actor, user);
      this.assertStatus(user, [AccountStatus.ACTIVE]);
      const before = this.snapshot(user);

      user.status = AccountStatus.SUSPENDED;
      user.suspendedAt = new Date();
      user.suspendedReason = reason;
      user.sessionVersion += 1;
      user.authorizationRevision += 1;
      await this.userRepository.save(user);
      await this.recordLifecycleChange({
        action: 'iam.user.suspended',
        actorId: actor.id,
        user,
        before,
        reason,
        correlationId,
        bypass,
        cause: 'user.suspended',
        revokeSessions: true,
      });
    });
  }

  activate(
    actor: AuthenticatedUser,
    userId: Uuid,
    reason: string | undefined,
    correlationId: Uuid,
  ): Promise<void> {
    return this.txHost.withTransaction(async () => {
      const user = await this.requireUser(userId);
      const bypass = this.policy.assertCanManageAccount(actor, user);
      this.assertStatus(user, [
        AccountStatus.SUSPENDED,
        AccountStatus.PENDING_VERIFICATION,
      ]);
      const before = this.snapshot(user);

      user.status = AccountStatus.ACTIVE;
      user.suspendedAt = null;
      user.suspendedReason = null;
      await this.userRepository.save(user);
      await this.recordLifecycleChange({
        action: 'iam.user.activated',
        actorId: actor.id,
        user,
        before,
        reason,
        correlationId,
        bypass,
        cause: 'user.activated',
      });
    });
  }

  softDelete(
    actor: AuthenticatedUser,
    userId: Uuid,
    reason: string | undefined,
    correlationId: Uuid,
  ): Promise<void> {
    return this.txHost.withTransaction(async () => {
      const user = await this.requireUser(userId);
      const bypass = this.policy.assertCanManageAccount(actor, user);
      this.assertStatus(user, [AccountStatus.ACTIVE, AccountStatus.SUSPENDED]);
      const before = this.snapshot(user);

      user.status = AccountStatus.DELETED;
      user.deletedAt = new Date();
      user.sessionVersion += 1;
      user.authorizationRevision += 1;
      await this.userRepository.save(user);
      await this.recordLifecycleChange({
        action: 'iam.user.deleted',
        actorId: actor.id,
        user,
        before,
        reason,
        correlationId,
        bypass,
        cause: 'user.deleted',
        revokeSessions: true,
      });
    });
  }

  revokeSessions(
    actor: AuthenticatedUser,
    userId: Uuid,
    reason: string | undefined,
    correlationId: Uuid,
  ): Promise<void> {
    return this.txHost.withTransaction(async () => {
      const user = await this.requireUser(userId);
      const bypass = this.policy.assertCanManageAccount(actor, user);

      await this.revokeSessionsTransaction(
        actor.id,
        user,
        reason,
        correlationId,
        bypass,
      );
    });
  }

  revokeOwnSessions(userId: Uuid, correlationId: Uuid): Promise<void> {
    return this.txHost.withTransaction(async () => {
      const user = await this.requireUser(userId);

      await this.revokeSessionsTransaction(
        userId,
        user,
        undefined,
        correlationId,
        false,
      );
    });
  }

  changePassword(
    userId: Uuid,
    currentPassword: string,
    newPassword: string,
    correlationId: Uuid,
  ): Promise<void> {
    return this.txHost.withTransaction(async () => {
      const user = await this.requireUser(userId);
      this.assertStatus(user, [AccountStatus.ACTIVE]);

      if (!(await validateHash(currentPassword, user.password))) {
        throw new UnauthorizedException('Invalid current password');
      }

      const before = this.snapshot(user);
      user.password = await generateHash(
        newPassword,
        this.configService.authConfig.bcryptRounds,
      );
      user.sessionVersion += 1;
      await this.userRepository.save(user);
      await this.recordLifecycleChange({
        action: 'auth.password.changed',
        actorId: userId,
        user,
        before,
        correlationId,
        bypass: false,
        cause: 'password.changed',
        revokeSessions: true,
      });
    });
  }

  private async revokeSessionsTransaction(
    actorId: Uuid,
    user: UserEntity,
    reason: string | undefined,
    correlationId: Uuid,
    bypass: boolean,
  ): Promise<void> {
    const before = this.snapshot(user);
    user.sessionVersion += 1;
    await this.userRepository.save(user);
    await this.recordLifecycleChange({
      action: 'iam.user.sessions_revoked',
      actorId,
      user,
      before,
      reason,
      correlationId,
      bypass,
      cause: 'sessions.revoked',
      revokeSessions: true,
    });
  }

  private async requireUser(userId: Uuid): Promise<UserEntity> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: {
        roles: { permissions: true },
        directPermissions: true,
      },
      lock: { mode: 'pessimistic_write' },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return user;
  }

  private assertStatus(user: UserEntity, allowed: AccountStatus[]): void {
    if (!allowed.includes(user.status)) {
      throw new ConflictException({
        code: 'ACCOUNT_INVALID_TRANSITION',
        message: `Account cannot transition from ${user.status}`,
      });
    }
  }

  private snapshot(user: UserEntity): Record<string, unknown> {
    return {
      status: user.status,
      authorizationRevision: user.authorizationRevision,
      sessionVersion: user.sessionVersion,
      suspendedAt: user.suspendedAt,
      suspendedReason: user.suspendedReason,
      deletedAt: user.deletedAt,
    };
  }

  private async recordLifecycleChange(options: {
    action: string;
    actorId: Uuid;
    user: UserEntity;
    before: Record<string, unknown>;
    reason?: string;
    correlationId: Uuid;
    bypass: boolean;
    cause: string;
    revokeSessions?: boolean;
  }): Promise<void> {
    await this.auditService.record(this.txHost.tx, {
      action: options.action,
      actorId: options.actorId,
      subjectType: 'user',
      subjectId: options.user.id,
      before: options.before,
      after: this.snapshot(options.user),
      reason: options.reason,
      correlationId: options.correlationId,
      systemAdminBypass: options.bypass,
    });
    await this.outboxService.enqueue(this.txHost.tx, 'authorization.changed', {
      userIds: [options.user.id],
      cause: options.cause,
      revokeSessions: options.revokeSessions,
    });
  }
}
