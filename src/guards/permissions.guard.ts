import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { Permission } from '../constants/permissions.enum';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { type AuthenticatedUser } from '../types/auth-user.type';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<
      Permission[] | undefined
    >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    // If no permissions are required, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    const { user } = request;

    if (!user?.id) {
      throw new ForbiddenException('User not authenticated');
    }

    const userPermissions = Array.isArray(user.computedPermissions)
      ? user.computedPermissions
      : [];
    const userPermissionSet = new Set(userPermissions);

    // Check if the user has all the required permissions
    const hasAllRequiredPermissions = requiredPermissions.every((permission) =>
      userPermissionSet.has(permission),
    );

    if (!hasAllRequiredPermissions) {
      const missingPermissions = requiredPermissions.filter(
        (permission) => !userPermissionSet.has(permission),
      );

      throw new ForbiddenException(
        `Missing required permissions: ${missingPermissions.join(', ')}`,
      );
    }

    return true;
  }
}
