import {
  applyDecorators,
  BadRequestException,
  Param,
  type PipeTransform,
} from '@nestjs/common';
import { type Type } from '@nestjs/common/interfaces';
import { ApiBearerAuth, ApiUnauthorizedResponse } from '@nestjs/swagger';

import { isAcceptedUuid } from '../common/uuid';
import type { Permission } from '../constants/permissions.enum';
import { Permissions } from './permissions.decorator';

class ParseAcceptedUuidPipe implements PipeTransform<string, Uuid> {
  transform(value: string): Uuid {
    if (!isAcceptedUuid(value)) {
      throw new BadRequestException(
        'Validation failed (UUIDv4 or UUIDv7 is expected)',
      );
    }

    return value;
  }
}

export function Auth(permissions: Permission[] = []): MethodDecorator {
  return applyDecorators(
    Permissions(permissions),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
  );
}

export function UUIDParam(
  property: string,
  ...pipes: Array<Type<PipeTransform> | PipeTransform>
): ParameterDecorator {
  return Param(property, new ParseAcceptedUuidPipe(), ...pipes);
}
