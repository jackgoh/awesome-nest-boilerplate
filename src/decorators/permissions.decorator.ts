import { Reflector } from '@nestjs/core';

import type { Permission } from '../constants/permissions.enum';

export const PERMISSIONS_KEY = 'permissions';

export const Permissions = Reflector.createDecorator<Permission[]>({
  key: PERMISSIONS_KEY,
});
