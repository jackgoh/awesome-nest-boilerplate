import { Logger } from '@nestjs/common';
import { type EntityManager, In } from 'typeorm';

import { Permission } from '../../constants/permissions.enum';
import { PermissionEntity } from '../../modules/iam/entities/permission.entity';
import { RoleEntity } from '../../modules/iam/entities/role.entity';
import { UserEntity } from '../../modules/user/user.entity';
import { type Uuid } from '../../types';

interface IRoleSeedData {
  name: string;
  description: string;
  permissions: Permission[];
}

const logger = new Logger('RolesSeeder');

const ROLE_CONFIGS: IRoleSeedData[] = [
  {
    name: 'user',
    description: 'Standard user with basic permissions',
    permissions: [
      Permission.PROFILE_READ,
      Permission.PROFILE_UPDATE,
      Permission.AUTH_REFRESH,
      Permission.USER_READ,
    ],
  },
  {
    name: 'moderator',
    description: 'Moderator with user management permissions',
    permissions: [
      Permission.USER_READ,
      Permission.USER_LIST,
      Permission.USER_UPDATE,
      Permission.ROLE_READ,
      Permission.ROLE_LIST,
      Permission.PERMISSION_READ,
      Permission.PERMISSION_LIST,
      Permission.HEALTH_READ,
      Permission.AUTH_REFRESH,
      Permission.AUTH_LOGOUT,
      Permission.PROFILE_READ,
      Permission.PROFILE_UPDATE,
    ],
  },
  {
    name: 'admin',
    description: 'Administrator with full system access',
    permissions: [
      Permission.USER_READ,
      Permission.USER_CREATE,
      Permission.USER_UPDATE,
      Permission.USER_DELETE,
      Permission.USER_LIST,
      Permission.ROLE_READ,
      Permission.ROLE_MANAGE,
      Permission.ROLE_LIST,
      Permission.ROLE_ASSIGN,
      Permission.PERMISSION_READ,
      Permission.PERMISSION_MANAGE,
      Permission.PERMISSION_LIST,
      Permission.PERMISSION_ASSIGN,
      Permission.SYSTEM_ADMIN,
      Permission.SYSTEM_SETTINGS,
      Permission.SYSTEM_LOGS,
      Permission.SYSTEM_MAINTENANCE,
      Permission.AUDIT_READ,
      Permission.AUDIT_EXPORT,
      Permission.HEALTH_READ,
      Permission.AUTH_REFRESH,
      Permission.AUTH_LOGOUT,
      Permission.PROFILE_READ,
      Permission.PROFILE_UPDATE,
    ],
  },
];

/** Idempotently synchronize built-in roles and their permission assignments. */
export async function seedRoles(manager: EntityManager): Promise<Uuid[]> {
  const roleRepository = manager.getRepository(RoleEntity);
  const permissionRepository = manager.getRepository(PermissionEntity);
  const affectedUsers = await manager
    .getRepository(UserEntity)
    .createQueryBuilder('user')
    .select('user.id', 'id')
    .innerJoin('user.roles', 'role')
    .where('role.name IN (:...roleNames)', {
      roleNames: ROLE_CONFIGS.map(({ name }) => name),
    })
    .getRawMany<{ id: Uuid }>();

  for (const roleConfig of ROLE_CONFIGS) {
    let role = await roleRepository.findOne({
      where: { name: roleConfig.name },
      relations: { permissions: true },
    });

    const permissions = await permissionRepository.find({
      where: { name: In(roleConfig.permissions) },
    });

    if (permissions.length !== roleConfig.permissions.length) {
      const foundPermissionNames = permissions.map(
        (permission) => permission.name,
      );
      const missingPermissions = roleConfig.permissions.filter(
        (permission) => !foundPermissionNames.includes(permission),
      );
      logger.warn(
        `Missing permissions for role ${roleConfig.name}:`,
        missingPermissions,
      );
    }

    if (!role) {
      role = roleRepository.create({
        name: roleConfig.name,
        description: roleConfig.description,
        permissions,
        isSystem: true,
      });
    } else {
      role.permissions = permissions;
      role.description = roleConfig.description;
      role.isSystem = true;
    }

    await roleRepository.save(role);
    logger.log(
      `Synchronized role: ${roleConfig.name} with ${permissions.length} permissions`,
    );
  }

  logger.log('Roles seeding completed successfully');

  return affectedUsers.map(({ id }) => id);
}

export default seedRoles;
