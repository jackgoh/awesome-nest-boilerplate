import {
  ClassField,
  StringFieldOptional,
  WalletAddressFieldOptional,
} from '@/decorators';
import { UserDto } from '@/modules/user-v2/dtos/user.dto';
import { Address } from 'viem';

export class UpdateTokenDto {
  @StringFieldOptional({ maxLength: 50 })
  name?: string;

  @StringFieldOptional({ maxLength: 5 })
  symbol?: string;

  @WalletAddressFieldOptional()
  contract_address?: Address;

  @ClassField(() => UserDto)
  user?: UserDto;
}
