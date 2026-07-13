import { ForbiddenException, Injectable } from '@nestjs/common';

import { Permission } from '../../constants/permissions.enum';
import { type AuthenticatedUser } from '../../types/auth-user.type';
import { type PermissionEntity } from './entities/permission.entity';
import { type RoleEntity } from './entities/role.entity';
import { type UserEntity } from '../user/user.entity';

@Injectable()
export class IamPolicyService {
  isSystemAdministrator(actor: AuthenticatedUser): boolean {
    return actor.computedPermissions.includes(Permission.SYSTEM_ADMIN);
  }

  assertRoleMutable(role: RoleEntity): void {
    if (role.isSystem) {
      throw new ForbiddenException({
        code: 'IAM_SYSTEM_ROLE_PROTECTED',
        message: 'System roles cannot be changed',
      });
    }
  }

  assertCanManageAccount(
    actor: AuthenticatedUser,
    target: UserEntity,
  ): boolean {
    const bypass = this.isSystemAdministrator(actor);
    const targetPermissions = [
      ...target.roles.flatMap((role) =>
        role.permissions.map((permission) => permission.name),
      ),
      ...(target.directPermissions ?? []).map((permission) => permission.name),
    ];
    const targetIsSystemAdministrator = targetPermissions.includes(
      Permission.SYSTEM_ADMIN,
    );

    if (targetIsSystemAdministrator && !bypass) {
      throw new ForbiddenException({
        code: 'IAM_GRANT_NOT_ALLOWED',
        message:
          'System administrators can only be managed by an equivalent authority',
      });
    }

    return bypass;
  }

  assertCanGrantPermissions(
    actor: AuthenticatedUser,
    permissions: PermissionEntity[],
  ): boolean {
    const bypass = this.isSystemAdministrator(actor);

    if (bypass) {
      return true;
    }

    const grantable = new Set(actor.computedPermissions);

    if (!grantable.has(Permission.PERMISSION_ASSIGN)) {
      throw new ForbiddenException({
        code: 'IAM_GRANT_NOT_ALLOWED',
        message: 'Permission assignment authority is required',
      });
    }

    const denied = permissions.filter(
      (permission) => !grantable.has(permission.name),
    );

    if (denied.length > 0) {
      throw new ForbiddenException({
        code: 'IAM_GRANT_NOT_ALLOWED',
        message: 'One or more permissions are outside the actor grant set',
        permissionIds: denied.map(({ id }) => id),
      });
    }

    return false;
  }

  assertCanAssignRoles(actor: AuthenticatedUser, roles: RoleEntity[]): boolean {
    const permissions = roles.flatMap((role) => role.permissions);

    return this.assertCanGrantPermissions(actor, permissions);
  }
}
