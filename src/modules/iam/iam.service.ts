import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { type TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { In, type Repository } from 'typeorm';

import { type AuditEventEntity } from '../audit/audit-event.entity';
import { AuditService } from '../audit/audit.service';
import { OutboxService } from '../outbox/outbox.service';
import { UserEntity } from '../user/user.entity';
import { AuthorizationRevisionService } from './authorization-revision.service';
import { type AuditEventsQueryDto } from './dto/audit-events-query.dto';
import { type CreateRoleDto } from './dto/create-role.dto';
import { type ReplaceUserDirectPermissionsDto } from './dto/replace-user-direct-permissions.dto';
import { type ReplaceUserRolesDto } from './dto/replace-user-roles.dto';
import { type UpdateRoleDto } from './dto/update-role.dto';
import { PermissionEntity } from './entities/permission.entity';
import { RoleEntity } from './entities/role.entity';
import { IamPolicyService } from './iam-policy.service';
import { type AuthenticatedUser } from '../../types/auth-user.type';

@Injectable()
export class IAMService {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
    private readonly policy: IamPolicyService,
    private readonly revisions: AuthorizationRevisionService,
    private readonly auditService: AuditService,
    private readonly outboxService: OutboxService,
  ) {}

  private get roleRepository(): Repository<RoleEntity> {
    return this.txHost.tx.getRepository(RoleEntity);
  }

  private get permissionRepository(): Repository<PermissionEntity> {
    return this.txHost.tx.getRepository(PermissionEntity);
  }

  private get userRepository(): Repository<UserEntity> {
    return this.txHost.tx.getRepository(UserEntity);
  }

  createRole(
    actor: AuthenticatedUser,
    dto: CreateRoleDto,
    correlationId: Uuid,
  ): Promise<RoleEntity> {
    return this.txHost.withTransaction(async () => {
      const role = await this.roleRepository.save(
        this.roleRepository.create({
          name: dto.name,
          description: dto.description,
          isSystem: false,
          permissions: [],
        }),
      );
      const bypass = this.policy.isSystemAdministrator(actor);

      await this.auditService.record(this.txHost.tx, {
        action: 'iam.role.created',
        actorId: actor.id,
        subjectType: 'role',
        subjectId: role.id,
        after: this.roleSnapshot(role),
        correlationId,
        systemAdminBypass: bypass,
      });
      await this.outboxService.enqueue(
        this.txHost.tx,
        'authorization.changed',
        { userIds: [], cause: 'role.created' },
      );

      return role;
    });
  }

  findAllRoles(): Promise<RoleEntity[]> {
    return this.roleRepository.find({ relations: { permissions: true } });
  }

  async findRoleById(id: string): Promise<RoleEntity> {
    const role = await this.roleRepository.findOne({
      where: { id: id as Uuid },
      relations: { permissions: true },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    return role;
  }

  findRoleByName(name: string): Promise<RoleEntity | null> {
    return this.roleRepository.findOne({
      where: { name },
      relations: { permissions: true },
    });
  }

  updateRole(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateRoleDto,
    correlationId: Uuid,
  ): Promise<RoleEntity> {
    return this.txHost.withTransaction(async () => {
      const role = await this.findRoleById(id);
      this.policy.assertRoleMutable(role);

      const before = this.roleSnapshot(role);
      let bypass = false;

      if (dto.permissionIds !== undefined) {
        role.permissions = await this.requirePermissions(
          dto.permissionIds as Uuid[],
        );
        bypass = this.policy.assertCanGrantPermissions(actor, role.permissions);
      }

      if (dto.name !== undefined) {
        role.name = dto.name;
      }

      if (dto.description !== undefined) {
        role.description = dto.description;
      }

      const affectedUserIds = await this.findUserIdsByRole(role.id);
      const savedRole = await this.roleRepository.save(role);

      await this.revisions.advanceForUsers(this.txHost.tx, affectedUserIds);
      await this.auditService.record(this.txHost.tx, {
        action: 'iam.role.updated',
        actorId: actor.id,
        subjectType: 'role',
        subjectId: role.id,
        before,
        after: this.roleSnapshot(savedRole),
        reason: dto.reason,
        correlationId,
        systemAdminBypass: bypass,
      });
      await this.outboxService.enqueue(
        this.txHost.tx,
        'authorization.changed',
        { userIds: affectedUserIds, cause: 'role.updated' },
      );

      return savedRole;
    });
  }

  deleteRole(
    actor: AuthenticatedUser,
    id: string,
    correlationId: Uuid,
  ): Promise<void> {
    return this.txHost.withTransaction(async () => {
      const role = await this.findRoleById(id);
      this.policy.assertRoleMutable(role);
      const memberIds = await this.findUserIdsByRole(role.id);

      if (memberIds.length > 0) {
        throw new ConflictException({
          code: 'IAM_ROLE_HAS_MEMBERS',
          message: 'Assigned roles must be unassigned before deletion',
          memberCount: memberIds.length,
        });
      }

      await this.roleRepository.remove(role);
      await this.auditService.record(this.txHost.tx, {
        action: 'iam.role.deleted',
        actorId: actor.id,
        subjectType: 'role',
        subjectId: role.id,
        before: this.roleSnapshot(role),
        correlationId,
        systemAdminBypass: this.policy.isSystemAdministrator(actor),
      });
      await this.outboxService.enqueue(
        this.txHost.tx,
        'authorization.changed',
        { userIds: [], cause: 'role.deleted' },
      );
    });
  }

  findAllPermissions(): Promise<PermissionEntity[]> {
    return this.permissionRepository.find();
  }

  async findPermissionById(id: string): Promise<PermissionEntity> {
    const permission = await this.permissionRepository.findOneBy({
      id: id as Uuid,
    });

    if (!permission) {
      throw new NotFoundException(`Permission with ID ${id} not found`);
    }

    return permission;
  }

  async findPermissionsByIds(ids: Uuid[]): Promise<PermissionEntity[]> {
    if (ids.length === 0) {
      return [];
    }

    return this.permissionRepository.findBy({ id: In(ids) });
  }

  replaceUserRoles(
    actor: AuthenticatedUser,
    userId: Uuid,
    dto: ReplaceUserRolesDto,
    correlationId: Uuid,
  ): Promise<void> {
    return this.txHost.withTransaction(async () => {
      const user = await this.requireUser(userId);
      const roles = await this.requireRoles(dto.roleIds as Uuid[]);
      const bypass = this.policy.assertCanAssignRoles(actor, roles);
      const before = { roleIds: user.roles.map(({ id }) => id) };

      user.roles = roles;
      await this.userRepository.save(user);
      await this.revisions.advanceForUsers(this.txHost.tx, [user.id]);
      await this.auditService.record(this.txHost.tx, {
        action: 'iam.user_roles.replaced',
        actorId: actor.id,
        subjectType: 'user',
        subjectId: user.id,
        before,
        after: { roleIds: roles.map(({ id }) => id) },
        reason: dto.reason,
        correlationId,
        systemAdminBypass: bypass,
      });
      await this.outboxService.enqueue(
        this.txHost.tx,
        'authorization.changed',
        { userIds: [user.id], cause: 'role.assigned' },
      );
    });
  }

  replaceUserDirectPermissions(
    actor: AuthenticatedUser,
    userId: Uuid,
    dto: ReplaceUserDirectPermissionsDto,
    correlationId: Uuid,
  ): Promise<void> {
    return this.txHost.withTransaction(async () => {
      const user = await this.requireUser(userId);
      const permissions = await this.requirePermissions(
        dto.permissionIds as Uuid[],
      );
      const bypass = this.policy.assertCanGrantPermissions(actor, permissions);
      const before = {
        permissionIds: (user.directPermissions ?? []).map(({ id }) => id),
      };

      user.directPermissions = permissions;
      await this.userRepository.save(user);
      await this.revisions.advanceForUsers(this.txHost.tx, [user.id]);
      await this.auditService.record(this.txHost.tx, {
        action: 'iam.user_direct_permissions.replaced',
        actorId: actor.id,
        subjectType: 'user',
        subjectId: user.id,
        before,
        after: { permissionIds: permissions.map(({ id }) => id) },
        reason: dto.reason,
        correlationId,
        systemAdminBypass: bypass,
      });
      await this.outboxService.enqueue(
        this.txHost.tx,
        'authorization.changed',
        { userIds: [user.id], cause: 'direct-permissions.replaced' },
      );
    });
  }

  findAuditEvents(query: AuditEventsQueryDto): Promise<AuditEventEntity[]> {
    return this.auditService.find({
      action: query.action,
      actorId: query.actorId as Uuid | undefined,
      subjectId: query.subjectId as Uuid | undefined,
      limit: query.limit,
    });
  }

  private async requireUser(userId: Uuid): Promise<UserEntity> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: {
        roles: { permissions: true },
        directPermissions: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return user;
  }

  private async requireRoles(ids: Uuid[]): Promise<RoleEntity[]> {
    this.assertNoDuplicates(ids, 'role');
    const roles =
      ids.length === 0
        ? []
        : await this.roleRepository.find({
            where: { id: In(ids) },
            relations: { permissions: true },
          });
    this.assertAllFound(ids, roles, 'IAM_UNKNOWN_ROLE_IDS');

    return roles;
  }

  private async requirePermissions(ids: Uuid[]): Promise<PermissionEntity[]> {
    this.assertNoDuplicates(ids, 'permission');
    const permissions = await this.findPermissionsByIds(ids);
    this.assertAllFound(ids, permissions, 'IAM_UNKNOWN_PERMISSION_IDS');

    return permissions;
  }

  private assertNoDuplicates(ids: Uuid[], resource: string): void {
    if (new Set(ids).size !== ids.length) {
      throw new UnprocessableEntityException({
        code: 'IAM_DUPLICATE_IDS',
        message: `Duplicate ${resource} IDs are not allowed`,
      });
    }
  }

  private assertAllFound(
    requestedIds: Uuid[],
    entities: Array<{ id: Uuid }>,
    code: string,
  ): void {
    const foundIds = new Set(entities.map(({ id }) => id));
    const invalidIds = requestedIds.filter((id) => !foundIds.has(id));

    if (invalidIds.length > 0) {
      throw new UnprocessableEntityException({
        code,
        message: 'One or more referenced IAM resources do not exist',
        invalidIds,
      });
    }
  }

  private async findUserIdsByRole(roleId: Uuid): Promise<Uuid[]> {
    const rows = await this.userRepository
      .createQueryBuilder('user')
      .select('user.id', 'id')
      .innerJoin('user.roles', 'role', 'role.id = :roleId', { roleId })
      .getRawMany<{ id: Uuid }>();

    return rows.map(({ id }) => id);
  }

  private roleSnapshot(role: RoleEntity): Record<string, unknown> {
    return {
      id: role.id,
      name: role.name,
      description: role.description ?? null,
      isSystem: role.isSystem,
      permissionIds: role.permissions.map(({ id }) => id),
    };
  }
}
