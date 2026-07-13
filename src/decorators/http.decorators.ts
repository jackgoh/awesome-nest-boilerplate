import {
  applyDecorators,
  Param,
  ParseUUIDPipe,
  type PipeTransform,
  UseInterceptors,
} from '@nestjs/common';
import { type Type } from '@nestjs/common/interfaces';
import { ApiBearerAuth, ApiUnauthorizedResponse } from '@nestjs/swagger';

import type { Permission } from '../constants/permissions.enum';
import { AuthUserInterceptor } from '../interceptors/auth-user-interceptor.service';
import { Permissions } from './permissions.decorator';

export function Auth(permissions: Permission[] = []): MethodDecorator {
  return applyDecorators(
    Permissions(permissions),
    ApiBearerAuth(),
    UseInterceptors(AuthUserInterceptor),
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
  );
}

export function UUIDParam(
  property: string,
  ...pipes: Array<Type<PipeTransform> | PipeTransform>
): ParameterDecorator {
  return Param(property, new ParseUUIDPipe({ version: '4' }), ...pipes);
}
