import { Test, type TestingModule } from '@nestjs/testing';
import { TransactionHost } from '@nestjs-cls/transactional';

import { type Uuid } from '../../types';
import { CacheService } from '../cache/cache.service';
import { UserEntity } from '../user/user.entity';
import { PermissionEntity } from './entities/permission.entity';
import { RoleEntity } from './entities/role.entity';
import { IAMService } from './iam.service';

const roleRepository = {
  create: jest.fn(),
  delete: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
};

const permissionRepository = {
  find: jest.fn(),
  findBy: jest.fn(),
};

const userQueryBuilder = {
  select: jest.fn(),
  innerJoin: jest.fn(),
  getRawMany: jest.fn(),
};

const userRepository = {
  createQueryBuilder: jest.fn(),
};

const transactionalManager = {
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

    throw new Error('Unexpected repository requested');
  }),
};

describe('IAMService', () => {
  const roleId = 'f08792a4-a9f8-4fd6-87ec-855b55e98f4c' as Uuid;
  const firstUserId = '57f9af62-eabc-4ee8-9a1c-b010a51ae31e' as Uuid;
  const secondUserId = 'f3f1c524-5de4-489f-b62e-f337008169bb' as Uuid;
  const role = {
    id: roleId,
    name: 'moderator',
    isSystem: false,
    description: 'Moderates content',
    permissions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    toDto: jest.fn(),
  } as RoleEntity;

  let service: IAMService;
  let cacheService: { invalidateUserAuthorization: jest.Mock };

  beforeEach(async () => {
    jest.clearAllMocks();
    userQueryBuilder.select.mockReturnValue(userQueryBuilder);
    userQueryBuilder.innerJoin.mockReturnValue(userQueryBuilder);
    userQueryBuilder.getRawMany.mockResolvedValue([
      { id: firstUserId },
      { id: secondUserId },
    ]);
    userRepository.createQueryBuilder.mockReturnValue(userQueryBuilder);
    roleRepository.findOne.mockResolvedValue({ ...role });
    roleRepository.save.mockImplementation((savedRole: RoleEntity) =>
      Promise.resolve(savedRole),
    );
    roleRepository.delete.mockResolvedValue({ affected: 1 });
    permissionRepository.findBy.mockResolvedValue([]);
    cacheService = {
      invalidateUserAuthorization: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IAMService,
        {
          provide: TransactionHost,
          useValue: {
            tx: transactionalManager,
            withTransaction: jest.fn((operation: () => Promise<unknown>) =>
              operation(),
            ),
          },
        },
        {
          provide: CacheService,
          useValue: cacheService,
        },
      ],
    }).compile();

    service = module.get(IAMService);
  });

  it('resolves repositories through the transactional manager', async () => {
    roleRepository.find.mockResolvedValue([]);

    await expect(service.findAllRoles()).resolves.toEqual([]);

    expect(transactionalManager.getRepository).toHaveBeenCalledWith(RoleEntity);
  });

  it('uses TypeORM 1 object-shaped relation configuration', async () => {
    roleRepository.find.mockResolvedValue([]);

    await service.findAllRoles();

    expect(roleRepository.find).toHaveBeenCalledWith({
      relations: { permissions: true },
    });
  });

  it('invalidates every assigned user after a role update commits', async () => {
    await service.updateRole(roleId, { permissionIds: [] });

    expect(userQueryBuilder.select).toHaveBeenCalledWith('user.id', 'id');
    expect(userQueryBuilder.innerJoin).toHaveBeenCalledWith(
      'user.roles',
      'role',
      'role.id = :roleId',
      { roleId },
    );
    expect(cacheService.invalidateUserAuthorization).toHaveBeenCalledWith([
      firstUserId,
      secondUserId,
    ]);
    expect(roleRepository.save.mock.invocationCallOrder[0]).toBeLessThan(
      cacheService.invalidateUserAuthorization.mock.invocationCallOrder[0],
    );
  });

  it('invalidates assigned users for a name-only role update', async () => {
    await service.updateRole(roleId, { name: 'support' });

    expect(roleRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'support' }),
    );
    expect(cacheService.invalidateUserAuthorization).toHaveBeenCalledWith([
      firstUserId,
      secondUserId,
    ]);
  });

  it('does not invalidate users when a role update rolls back', async () => {
    roleRepository.save.mockRejectedValue(new Error('database failure'));

    await expect(
      service.updateRole(roleId, { description: 'new description' }),
    ).rejects.toThrow('database failure');
    expect(cacheService.invalidateUserAuthorization).not.toHaveBeenCalled();
  });

  it('invalidates assigned users after a role is deleted', async () => {
    await service.deleteRole(roleId);

    expect(roleRepository.delete).toHaveBeenCalledWith(roleId);
    expect(cacheService.invalidateUserAuthorization).toHaveBeenCalledWith([
      firstUserId,
      secondUserId,
    ]);
    expect(roleRepository.delete.mock.invocationCallOrder[0]).toBeLessThan(
      cacheService.invalidateUserAuthorization.mock.invocationCallOrder[0],
    );
  });

  it('does not invalidate users when role deletion fails', async () => {
    roleRepository.delete.mockRejectedValue(new Error('foreign key failure'));

    await expect(service.deleteRole(roleId)).rejects.toThrow(
      'foreign key failure',
    );
    expect(cacheService.invalidateUserAuthorization).not.toHaveBeenCalled();
  });
});
