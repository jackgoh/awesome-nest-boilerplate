import { ForbiddenException } from '@nestjs/common';

import { Permission } from '../../constants/permissions.enum';
import { type AuthenticatedUser } from '../../types/auth-user.type';
import { type PermissionEntity } from './entities/permission.entity';
import { IamPolicyService } from './iam-policy.service';

describe('IamPolicyService', () => {
  const service = new IamPolicyService();

  it('prevents granting authority the actor does not hold', () => {
    const actor = {
      computedPermissions: [Permission.PERMISSION_ASSIGN, Permission.USER_READ],
    } as unknown as AuthenticatedUser;
    const requested = [
      { id: 'permission-id', name: Permission.USER_DELETE },
    ] as PermissionEntity[];

    expect(() => service.assertCanGrantPermissions(actor, requested)).toThrow(
      ForbiddenException,
    );
  });

  it('centralizes and reports the system-administrator bypass', () => {
    const actor = {
      computedPermissions: [Permission.SYSTEM_ADMIN],
    } as unknown as AuthenticatedUser;
    const requested = [
      { id: 'permission-id', name: Permission.USER_DELETE },
    ] as PermissionEntity[];

    expect(service.assertCanGrantPermissions(actor, requested)).toBe(true);
  });
});
