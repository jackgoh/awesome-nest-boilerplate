import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import { type AuthenticatedUser } from '../types/auth-user.type';

export function AuthUser() {
  return createParamDecorator(
    (_data: unknown, context: ExecutionContext) =>
      context.switchToHttp().getRequest<{ user: AuthenticatedUser }>().user,
  )();
}
