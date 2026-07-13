import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

import { AbstractDto } from '../../../common/dto/abstract.dto';
import {
  BooleanField,
  StringField,
  StringFieldOptional,
} from '../../../decorators';
import { type RoleEntity } from '../entities/role.entity';
import { PermissionDto } from './permission.dto';

export class RoleDto extends AbstractDto {
  @StringField()
  name: string;

  @StringFieldOptional()
  description?: string;

  @BooleanField()
  isSystem: boolean;

  @ApiPropertyOptional({
    type: () => PermissionDto,
    isArray: true,
    nullable: true,
  })
  @Type(() => PermissionDto)
  permissions?: PermissionDto[];

  constructor(role: RoleEntity) {
    super(role);
    this.id = role.id;
    this.name = role.name;
    this.description = role.description;
    this.isSystem = role.isSystem;
    this.permissions = role.permissions.map((permission) => permission.toDto());
  }
}
