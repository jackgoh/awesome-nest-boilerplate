import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

import { AbstractDto } from '../../../common/dto/abstract.dto';
import { Permission } from '../../../constants/permissions.enum';
import {
  BooleanFieldOptional,
  EmailFieldOptional,
  EnumField,
  StringFieldOptional,
} from '../../../decorators';
import { type AuthenticatedUser } from '../../../types/auth-user.type';
import { RoleDto } from '../../iam/dto/role.dto';
import { type UserEntity } from '../user.entity';
import { AccountStatus } from '../account-status.enum';

// TODO, remove this class and use constructor's second argument's type
export type UserDtoOptions = Partial<{ isActive: boolean }>;

export class UserDto extends AbstractDto {
  @StringFieldOptional({ nullable: true })
  firstName?: string | null;

  @StringFieldOptional({ nullable: true })
  lastName?: string | null;

  @ApiProperty({ type: () => RoleDto, isArray: true })
  @Type(() => RoleDto)
  roles: RoleDto[] = [];

  @ApiProperty({
    type: [String],
    description: 'Array of user permissions (from roles + direct permissions)',
    example: [
      Permission.USER_READ,
      Permission.PROFILE_UPDATE,
      Permission.AUTH_REFRESH,
    ],
  })
  computedPermissions: Array<Permission | string> = [];

  @EnumField(() => AccountStatus)
  status: AccountStatus;

  @EmailFieldOptional({ nullable: true })
  email?: string | null;

  @StringFieldOptional({ nullable: true })
  avatar?: string | null;

  @BooleanFieldOptional()
  isActive?: boolean;

  constructor(user: UserEntity | AuthenticatedUser, options?: UserDtoOptions) {
    super(user);
    this.firstName = user.firstName;
    this.lastName = user.lastName;
    this.roles = user.roles.map((role) => role.toDto());
    this.email = user.email;
    this.avatar = user.avatar;
    this.status = user.status;
    this.isActive = options?.isActive ?? user.status === AccountStatus.ACTIVE;
    this.computedPermissions = user.computedPermissions ?? [];
  }
}
