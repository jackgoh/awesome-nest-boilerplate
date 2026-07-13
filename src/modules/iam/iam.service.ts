import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Transactional, TransactionHost } from '@nestjs-cls/transactional';
import { type TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { In, type Repository } from 'typeorm';

import { UserEntity } from '../user/user.entity';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { PermissionEntity } from './entities/permission.entity';
import { RoleEntity } from './entities/role.entity';

@Injectable()
export class IAMService {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {}

  private get roleRepository(): Repository<RoleEntity> {
    return this.txHost.tx.getRepository(RoleEntity);
  }

  private get permissionRepository(): Repository<PermissionEntity> {
    return this.txHost.tx.getRepository(PermissionEntity);
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

  @Transactional()
  async updateRole(
    id: string,
    updateRoleDto: UpdateRoleDto,
  ): Promise<RoleEntity> {
    const role = await this.findRoleById(id);
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

    return this.roleRepository.save(role);
  }

  async deleteRole(id: string): Promise<void> {
    const result = await this.roleRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }
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

  // --- Utility ---

  /**
   * Retrieves all unique permission names associated with a user through their roles.
   * @param userId The ID of the user.
   * @returns A promise resolving to an array of unique permission names.
   */
  async getPermissionsForUser(userId: Uuid): Promise<string[]> {
    const user = await this.txHost.tx
      .getRepository(UserEntity)
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'role')
      .leftJoinAndSelect('role.permissions', 'rolePermission')
      .leftJoinAndSelect('user.directPermissions', 'directPermission')
      .where('user.id = :userId', { userId })
      .getOne();

    if (!user) {
      return [];
    }

    const rolePermissions = user.roles.flatMap((role) =>
      role.permissions.map((p) => p.name),
    );

    const directPermissions = user.directPermissions?.map((p) => p.name) || [];

    return [...new Set([...rolePermissions, ...directPermissions])];
  }
}
