import { Logger } from '@nestjs/common';
import { type EntityManager } from 'typeorm';

import {
  Permission,
  PERMISSION_DESCRIPTIONS,
} from '../../constants/permissions.enum';
import { PermissionEntity } from '../../modules/iam/entities/permission.entity';

const logger = new Logger('PermissionsSeeder');

/** Idempotently synchronize the system permission catalogue. */
export async function seedPermissions(manager: EntityManager): Promise<void> {
  const permissionRepository = manager.getRepository(PermissionEntity);

  const permissionsData = Object.values(Permission).map((permission) => ({
    name: permission,
    description: PERMISSION_DESCRIPTIONS[permission],
    isSystem: true,
  }));

  const existingPermissions = await permissionRepository.find();
  const existingPermissionMap = new Map(
    existingPermissions.map((permission) => [permission.name, permission]),
  );

  const permissionsToCreate: Array<{
    name: Permission;
    description: string;
    isSystem: boolean;
  }> = [];
  const permissionsToUpdate: PermissionEntity[] = [];

  for (const permissionData of permissionsData) {
    const existingPermission = existingPermissionMap.get(permissionData.name);

    if (!existingPermission) {
      permissionsToCreate.push(permissionData);
    } else if (
      existingPermission.description !== permissionData.description ||
      !existingPermission.isSystem
    ) {
      existingPermission.description = permissionData.description;
      existingPermission.isSystem = true;
      permissionsToUpdate.push(existingPermission);
    }
  }

  if (permissionsToCreate.length > 0) {
    const newPermissions = permissionRepository.create(permissionsToCreate);
    await permissionRepository.save(newPermissions);
    logger.log(`Created ${permissionsToCreate.length} new permissions`);
  }

  if (permissionsToUpdate.length > 0) {
    await permissionRepository.save(permissionsToUpdate);
    logger.log(`Updated ${permissionsToUpdate.length} permissions`);
  }

  logger.log('Permissions seeding completed successfully');
}

export default seedPermissions;
