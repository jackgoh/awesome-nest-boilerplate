import {
  ConflictException,
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { Permission } from '../../constants/permissions.enum';
import { type Uuid } from '../../types';
import { type AuthenticatedUser } from '../../types/auth-user.type';
import { UserEntity } from '../user/user.entity';
import { PermissionEntity } from './entities/permission.entity';
import { RoleEntity } from './entities/role.entity';
import { IAMService } from './iam.service';

describe('IAMService', () => {
  const actorId = '57f9af62-eabc-4ee8-9a1c-b010a51ae31e' as Uuid;
  const roleId = 'f08792a4-a9f8-4fd6-87ec-855b55e98f4c' as Uuid;
  const userId = 'f3f1c524-5de4-489f-b62e-f337008169bb' as Uuid;
  const correlationId = '019f5ce3-cccb-7631-a9a1-cbacc12fb192' as Uuid;
  const actor = {
    id: actorId,
    computedPermissions: [
      Permission.ROLE_MANAGE,
      Permission.ROLE_ASSIGN,
      Permission.PERMISSION_ASSIGN,
      Permission.USER_READ,
    ],
  } as unknown as AuthenticatedUser;

  const userQueryBuilder = {
    select: jest.fn(),
    innerJoin: jest.fn(),
    getRawMany: jest.fn(),
  };
  const roleRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };
  const permissionRepository = {
    find: jest.fn(),
    findBy: jest.fn(),
    findOneBy: jest.fn(),
  };
  const userRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const manager = {
    getRepository: jest.fn((entity: unknown) => {
      if (entity === RoleEntity) {
        return roleRepository;
      }

      if (entity === PermissionEntity) {
        return permissionRepository;
      }

      if (entity === UserEntity) {
        return userRepository;
      }

      throw new Error('Unexpected repository');
    }),
  };
  const txHost = {
    tx: manager,
    withTransaction: jest.fn((callback: () => unknown) => callback()),
  };
  const revisions = { advanceForUsers: jest.fn() };
  const audit = { record: jest.fn() };
  const outbox = { enqueue: jest.fn() };
  const policy = {
    assertRoleMutable: jest.fn((role: RoleEntity) => {
      if (role.isSystem) {
        throw new ForbiddenException();
      }
    }),
    assertCanGrantPermissions: jest.fn().mockReturnValue(false),
    assertCanAssignRoles: jest.fn().mockReturnValue(false),
    isSystemAdministrator: jest.fn().mockReturnValue(false),
  };
  const service = new IAMService(
    txHost as never,
    policy as never,
    revisions as never,
    audit as never,
    outbox as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    userQueryBuilder.select.mockReturnValue(userQueryBuilder);
    userQueryBuilder.innerJoin.mockReturnValue(userQueryBuilder);
    userQueryBuilder.getRawMany.mockResolvedValue([]);
    userRepository.createQueryBuilder.mockReturnValue(userQueryBuilder);
    roleRepository.save.mockImplementation((value) => Promise.resolve(value));
    userRepository.save.mockImplementation((value) => Promise.resolve(value));
    audit.record.mockResolvedValue(undefined);
    outbox.enqueue.mockResolvedValue(undefined);
  });

  it('rejects changes to a protected system role', async () => {
    roleRepository.findOne.mockResolvedValue({
      id: roleId,
      name: 'admin',
      isSystem: true,
      permissions: [],
    });

    await expect(
      service.updateRole(actor, roleId, { name: 'renamed' }, correlationId),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(roleRepository.save).not.toHaveBeenCalled();
  });

  it('returns a conflict instead of leaking a foreign-key error on deletion', async () => {
    roleRepository.findOne.mockResolvedValue({
      id: roleId,
      name: 'support',
      isSystem: false,
      permissions: [],
    });
    userQueryBuilder.getRawMany.mockResolvedValue([{ id: userId }]);

    await expect(
      service.deleteRole(actor, roleId, correlationId),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(roleRepository.remove).not.toHaveBeenCalled();
  });

  it('advances member revisions and writes audit/outbox in the role transaction', async () => {
    const role = {
      id: roleId,
      name: 'support',
      description: null,
      isSystem: false,
      permissions: [],
    } as unknown as RoleEntity;
    roleRepository.findOne.mockResolvedValue(role);
    userQueryBuilder.getRawMany.mockResolvedValue([{ id: userId }]);

    await service.updateRole(
      actor,
      roleId,
      { description: 'Customer support', reason: 'Ticket OPS-42' },
      correlationId,
    );

    expect(revisions.advanceForUsers).toHaveBeenCalledWith(manager, [userId]);
    expect(audit.record).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({
        action: 'iam.role.updated',
        actorId,
        correlationId,
        reason: 'Ticket OPS-42',
      }),
    );
    expect(outbox.enqueue).toHaveBeenCalledWith(
      manager,
      'authorization.changed',
      { userIds: [userId], cause: 'role.updated' },
    );
  });

  it('rejects an unknown role ID without partially replacing assignments', async () => {
    userRepository.findOne.mockResolvedValue({
      id: userId,
      roles: [],
      directPermissions: [],
    });
    roleRepository.find.mockResolvedValue([]);

    await expect(
      service.replaceUserRoles(
        actor,
        userId,
        { roleIds: [roleId] },
        correlationId,
      ),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(userRepository.save).not.toHaveBeenCalled();
  });
});
