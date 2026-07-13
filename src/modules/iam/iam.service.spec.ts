import { Test, type TestingModule } from '@nestjs/testing';
import { TransactionHost } from '@nestjs-cls/transactional';

import { PermissionEntity } from './entities/permission.entity';
import { RoleEntity } from './entities/role.entity';
import { IAMService } from './iam.service';

const roleRepository = {
  find: jest.fn(),
  findOne: jest.fn(),
};

const permissionRepository = {
  find: jest.fn(),
};

const transactionalManager = {
  getRepository: jest.fn((entity: unknown) => {
    if (entity === RoleEntity) {
      return roleRepository;
    }

    if (entity === PermissionEntity) {
      return permissionRepository;
    }

    throw new Error('Unexpected repository requested');
  }),
};

describe('IAMService', () => {
  let service: IAMService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IAMService,
        {
          provide: TransactionHost,
          useValue: { tx: transactionalManager },
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
});
