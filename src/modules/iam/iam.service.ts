import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Transactional, TransactionHost } from '@nestjs-cls/transactional';
import { type TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { In, type Repository } from 'typeorm';

import { CacheService } from '../cache/cache.service';
import { UserEntity } from '../user/user.entity';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { PermissionEntity } from './entities/permission.entity';
import { RoleEntity } from './entities/role.entity';

interface IRoleMutationResult {
  affectedUserIds: Uuid[];
  role: RoleEntity;
}

@Injectable()
export class IAMService {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
    private readonly cacheService: CacheService,
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

  @Transactional()
  async createRole(createRoleDto: CreateRoleDto): Promise<RoleEntity> {
    const { name, description, permissionIds } = createRoleDto;
    let permissions: PermissionEntity[] = [];

    if (permissionIds && permissionIds.length > 0) {
      permissions = await this.findPermissionsByIds(permissionIds as Uuid[]);
    }

    const role = this.roleRepository.create({ name, description, permissions });

    return this.roleRepository.save(role);
  }

  async findAllRoles(): Promise<RoleEntity[]> {
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

  async findRoleByName(name: string): Promise<RoleEntity | null> {
    return this.roleRepository.findOne({
      where: { name },
      relations: { permissions: true },
    });
  }

  async updateRole(
    id: string,
    updateRoleDto: UpdateRoleDto,
  ): Promise<RoleEntity> {
    const result = await this.txHost.withTransaction(() =>
      this.updateRoleTransaction(id, updateRoleDto),
    );

    await this.cacheService.invalidateUserAuthorization(result.affectedUserIds);

    return result.role;
  }

  private async updateRoleTransaction(
    id: string,
    updateRoleDto: UpdateRoleDto,
  ): Promise<IRoleMutationResult> {
    const role = await this.findRoleById(id);
    const affectedUserIds = await this.findUserIdsByRole(role.id);
    const { name, description, permissionIds } = updateRoleDto;

    if (permissionIds !== undefined) {
      role.permissions =
        permissionIds.length > 0
          ? await this.findPermissionsByIds(permissionIds as Uuid[])
          : [];
    }

    role.name = name === undefined ? role.name : name;

    role.description =
      description === undefined ? role.description : description;

    const savedRole = await this.roleRepository.save(role);

    return { affectedUserIds, role: savedRole };
  }

  async deleteRole(id: string): Promise<void> {
    const affectedUserIds = await this.txHost.withTransaction(() =>
      this.deleteRoleTransaction(id),
    );

    await this.cacheService.invalidateUserAuthorization(affectedUserIds);
  }

  private async deleteRoleTransaction(id: string): Promise<Uuid[]> {
    const affectedUserIds = await this.findUserIdsByRole(id as Uuid);
    const result = await this.roleRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    return affectedUserIds;
  }

  async createPermission(
    createPermissionDto: CreatePermissionDto,
  ): Promise<PermissionEntity> {
    const existing = await this.permissionRepository.findOneBy({
      name: createPermissionDto.name,
    });

    if (existing) {
      throw new ConflictException(
        `Permission with name "${createPermissionDto.name}" already exists`,
      );
    }

    const permission = this.permissionRepository.create(createPermissionDto);

    return this.permissionRepository.save(permission);
  }

  async findAllPermissions(): Promise<PermissionEntity[]> {
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

  private async findUserIdsByRole(roleId: Uuid): Promise<Uuid[]> {
    const rows = await this.userRepository
      .createQueryBuilder('user')
      .select('user.id', 'id')
      .innerJoin('user.roles', 'role', 'role.id = :roleId', { roleId })
      .getRawMany<{ id: Uuid }>();

    return rows.map(({ id }) => id);
  }
}
