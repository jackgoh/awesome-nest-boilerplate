import { AbstractDto } from '@/common/dto/abstract.dto';
import { RoleType } from '@/constants';
import { EnumFieldOptional, WalletAddressField } from '@/decorators';
import { Address } from 'viem';
import { type UserEntity } from '../user.entity';

// TODO, remove this class and use constructor's second argument's type
export type UserDtoOptions = Partial<{ isActive: boolean }>;

export class UserDto extends AbstractDto {
  @WalletAddressField({ nullable: true })
  wallet_address!: Address;

  @EnumFieldOptional(() => RoleType)
  role?: RoleType;

  constructor(user: UserEntity) {
    super(user);
    this.role = user.role;
  }
}
